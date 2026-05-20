package logging

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var beijingLocation = time.FixedZone("Asia/Shanghai", 8*60*60)

type contextKey string

const requestIDKey contextKey = "request_id"

type Loggers struct {
	App   *slog.Logger
	Error *slog.Logger
	Calc  *slog.Logger
	files []*os.File
}

type Options struct {
	Dir      string
	Level    slog.Level
	JSON     bool
	ToStdout bool
}

type timeHandler struct {
	slog.Handler
}

func (h timeHandler) Handle(ctx context.Context, record slog.Record) error {
	record.Time = record.Time.In(beijingLocation)
	return h.Handler.Handle(ctx, record)
}

func New(opts Options) (*Loggers, error) {
	if opts.Dir == "" {
		opts.Dir = "logs"
	}
	if err := os.MkdirAll(opts.Dir, 0755); err != nil {
		return nil, err
	}

	appWriter, appFile, err := openWriter(opts.Dir, "backend-app.log", opts.ToStdout)
	if err != nil {
		return nil, err
	}
	errorWriter, errorFile, err := openWriter(opts.Dir, "backend-error.log", opts.ToStdout)
	if err != nil {
		_ = appFile.Close()
		return nil, err
	}
	calcWriter, calcFile, err := openWriter(opts.Dir, "calc-events.log", false)
	if err != nil {
		_ = appFile.Close()
		_ = errorFile.Close()
		return nil, err
	}

	handlerOpts := &slog.HandlerOptions{Level: opts.Level}
	return &Loggers{
		App:   slog.New(newHandler(appWriter, opts.JSON, handlerOpts)),
		Error: slog.New(newHandler(errorWriter, opts.JSON, handlerOpts)),
		Calc:  slog.New(newHandler(calcWriter, true, handlerOpts)),
		files: []*os.File{appFile, errorFile, calcFile},
	}, nil
}

func (l *Loggers) Close() error {
	var closeErr error
	for _, file := range l.files {
		if err := file.Close(); err != nil && closeErr == nil {
			closeErr = err
		}
	}
	return closeErr
}

func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

func RequestID(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDKey).(string)
	return requestID
}

func NewRequestID() string {
	var bytes [8]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return time.Now().Format("20060102150405000000000")
	}
	return hex.EncodeToString(bytes[:])
}

func ClientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			parts := strings.Split(forwarded, ",")
			if ip := strings.TrimSpace(parts[0]); ip != "" {
				return ip
			}
		}
		if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
			return realIP
		}
	}
	return remoteClientIP(r)
}

func HashIP(ip string, salt string) string {
	if ip == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(salt + ip))
	return hex.EncodeToString(sum[:8])
}

func newHandler(writer io.Writer, json bool, opts *slog.HandlerOptions) slog.Handler {
	if json {
		return timeHandler{slog.NewJSONHandler(writer, opts)}
	}
	return timeHandler{slog.NewTextHandler(writer, opts)}
}

func openWriter(dir, name string, stdout bool) (io.Writer, *os.File, error) {
	file, err := os.OpenFile(filepath.Join(dir, name), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, nil, err
	}
	if stdout {
		return io.MultiWriter(os.Stdout, file), file, nil
	}
	return file, file, nil
}

func remoteClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
