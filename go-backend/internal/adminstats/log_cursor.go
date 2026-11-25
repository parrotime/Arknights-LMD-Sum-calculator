package adminstats

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

const maxCalcLogLineSize = 1024 * 1024

func hashLogTail(tail []byte) string {
	digest := sha256.Sum256(tail)
	return hex.EncodeToString(digest[:])
}

func matchActiveLog(file *os.File, size int64, source *SourceSnapshot) (bool, error) {
	if source.Offset == 0 {
		return true, nil
	}
	if source.Offset < 0 || source.Offset > size {
		return false, nil
	}
	tailSize := source.TailSize
	if source.TailHash == "" {
		tailSize = int(min(256, source.Offset))
	}
	if tailSize < 1 || tailSize > maxCalcLogLineSize || int64(tailSize) > source.Offset {
		return false, nil
	}
	tail := make([]byte, tailSize)
	if _, err := file.ReadAt(tail, source.Offset-int64(tailSize)); err != nil {
		return false, err
	}
	hash := hashLogTail(tail)
	if source.TailHash != "" {
		return source.TailHash == hash, nil
	}
	source.TailSize, source.TailHash = tailSize, hash
	return true, nil
}

func scanCalcLog(reader io.Reader, source *SourceSnapshot, apply func(calcLogEvent)) error {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 64*1024), maxCalcLogLineSize)
	scanner.Split(func(data []byte, _ bool) (int, []byte, error) {
		if end := bytes.IndexByte(data, '\n'); end >= 0 {
			return end + 1, data[:end+1], nil
		}
		return 0, nil, nil
	})
	var lastLine []byte
	for scanner.Scan() {
		line := scanner.Bytes()
		source.Offset += int64(len(line))
		lastLine = append(lastLine[:0], line...)
		var event calcLogEvent
		if json.Unmarshal(line, &event) == nil {
			apply(event)
		}
	}
	if len(lastLine) > 0 {
		source.TailSize, source.TailHash = len(lastLine), hashLogTail(lastLine)
	}
	return scanner.Err()
}

func calcLogArchives(dir, name string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	prefix := name + "."
	byNumber := make(map[int]string)
	for _, entry := range entries {
		filename := entry.Name()
		suffix, matches := strings.CutPrefix(filename, prefix)
		if entry.IsDir() || !matches {
			continue
		}
		number, err := strconv.Atoi(strings.TrimSuffix(suffix, ".gz"))
		if err != nil || number < 1 {
			continue
		}
		if byNumber[number] == "" || !strings.HasSuffix(filename, ".gz") {
			byNumber[number] = filepath.Join(dir, filename)
		}
	}
	numbers := make([]int, 0, len(byNumber))
	for number := range byNumber {
		numbers = append(numbers, number)
	}
	sort.Ints(numbers)
	paths := make([]string, 0, len(numbers))
	for _, number := range numbers {
		paths = append(paths, byNumber[number])
	}
	return paths, nil
}

func recoverRotatedEvents(dir, name string, source SourceSnapshot) ([]calcLogEvent, bool, error) {
	paths, err := calcLogArchives(dir, name)
	if err != nil {
		return nil, false, err
	}
	if source.TailHash == "" {
		paths = paths[:min(1, len(paths))]
	}
	var events []calcLogEvent
	appendEvent := func(event calcLogEvent) { events = append(events, event) }
	for index, path := range paths {
		matches, err := readRotatedEvents(path, source, appendEvent)
		if err != nil {
			return nil, false, err
		}
		if !matches {
			continue
		}
		for newer := index - 1; newer >= 0; newer-- {
			if _, err := readRotatedEvents(paths[newer], SourceSnapshot{}, appendEvent); err != nil {
				return nil, false, err
			}
		}
		return events, true, nil
	}
	return nil, false, nil
}

func openCalcLog(path string) (io.Reader, func(), error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	if !strings.HasSuffix(path, ".gz") {
		return file, func() { file.Close() }, nil
	}
	compressed, err := gzip.NewReader(file)
	if err != nil {
		file.Close()
		return nil, nil, err
	}
	return compressed, func() {
		compressed.Close()
		file.Close()
	}, nil
}

func readRotatedEvents(path string, source SourceSnapshot, apply func(calcLogEvent)) (bool, error) {
	reader, closeLog, err := openCalcLog(path)
	if err != nil {
		return false, err
	}
	defer closeLog()

	if source.Offset > 0 {
		tailSize := source.TailSize
		if source.TailHash == "" {
			tailSize = 1
		}
		if tailSize < 1 || tailSize > maxCalcLogLineSize || int64(tailSize) > source.Offset {
			return false, nil
		}
		if _, err := io.CopyN(io.Discard, reader, source.Offset-int64(tailSize)); err != nil {
			return false, endOfLogError(err)
		}
		tail := make([]byte, tailSize)
		if _, err := io.ReadFull(reader, tail); err != nil {
			return false, endOfLogError(err)
		}
		if tail[tailSize-1] != '\n' || (source.TailHash != "" && hashLogTail(tail) != source.TailHash) {
			return false, nil
		}
	}
	return true, scanCalcLog(reader, &source, apply)
}

func endOfLogError(err error) error {
	if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
		return nil
	}
	return err
}
