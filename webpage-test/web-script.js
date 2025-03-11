const puppeteer = require("puppeteer");
const fs = require("fs");

// ��������洢����
const results = [];

async function runTest() {
  // ���������
  const browser = await puppeteer.launch({
    headless: false, // ����Ϊtrue�����ں�̨����
    slowMo: 50, // ���������ٶȣ����ڹ۲�
  });

  const page = await browser.newPage();

  // ������Ŀ����ҳ
  await page.goto("https://example.io/index.html");

  // ��һ�������̶�����500
  await page.type("input:nth-of-type(1)", "500");

  // �Եڶ����������������0~1000����������¼���
  for (let i = 0; i <= 1000; i++) {
    // ��յڶ��������
    await page.evaluate(() => {
      document.querySelector("input:nth-of-type(2)").value = "";
    });

    // ���뵱ǰֵ
    await page.type("input:nth-of-type(2)", i.toString());

    // ������һ���ύ��ť���������������
    // ���û�а�ť�����Զ����㣬����ʡ����һ��
    await page.click('button[type="submit"]');

    // ��ʼ��ʱ
    const startTime = performance.now();

    // �ȴ���������ݸ��£�������Ҫ����ѡ������
    await page.waitForFunction(
      'document.querySelector("output").textContent !== ""',
      { timeout: 5000 }
    );

    // ������ʱ
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // ��ȡ���������
    const outputContent = await page.evaluate(() => {
      return document.querySelector("output").textContent;
    });

    // ��¼���
    results.push({
      input1: 500,
      input2: i,
      output: outputContent,
      executionTime: executionTime,
    });

    console.log(
      `���� #${i}: ���� (500, ${i}) => ���: ${outputContent}, ִ��ʱ��: ${executionTime.toFixed(
        2
      )}ms`
    );
  }

  // ��������浽�ļ�
  fs.writeFileSync("test-results.json", JSON.stringify(results, null, 2));

  // �ر������
  await browser.close();

  // ����ͳ����Ϣ
  calculateStatistics();
}

function calculateStatistics() {
  const executionTimes = results.map((r) => r.executionTime);
  const avgTime =
    executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
  const maxTime = Math.max(...executionTimes);
  const minTime = Math.min(...executionTimes);

  console.log("\n����ͳ��:");
  console.log(`�ܲ�����: ${results.length}`);
  console.log(`ƽ��ִ��ʱ��: ${avgTime.toFixed(2)}ms`);
  console.log(`�ִ��ʱ��: ${maxTime.toFixed(2)}ms`);
  console.log(`���ִ��ʱ��: ${minTime.toFixed(2)}ms`);

  // ��ͳ����ϢҲ���浽�ļ�
  const statistics = { totalTests: results.length, avgTime, maxTime, minTime };
  fs.writeFileSync("test-statistics.json", JSON.stringify(statistics, null, 2));
}

// ���в���
runTest().catch((error) => {
  console.error("���Թ����г���:", error);
});
