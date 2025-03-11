const puppeteer = require("puppeteer");
const fs = require("fs");

// 创建结果存储数组
const results = [];

async function runTest() {
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: false, // 设置为true可以在后台运行
    slowMo: 50, // 放慢操作速度，便于观察
  });

  const page = await browser.newPage();

  // 导航到目标网页
  await page.goto("https://example.io/index.html");

  // 第一个输入框固定输入500
  await page.type("input:nth-of-type(1)", "500");

  // 对第二个输入框依次输入0~1000的整数并记录结果
  for (let i = 0; i <= 1000; i++) {
    // 清空第二个输入框
    await page.evaluate(() => {
      document.querySelector("input:nth-of-type(2)").value = "";
    });

    // 输入当前值
    await page.type("input:nth-of-type(2)", i.toString());

    // 假设有一个提交按钮，点击它触发计算
    // 如果没有按钮而是自动计算，可以省略这一步
    await page.click('button[type="submit"]');

    // 开始计时
    const startTime = performance.now();

    // 等待输出框内容更新（可能需要调整选择器）
    await page.waitForFunction(
      'document.querySelector("output").textContent !== ""',
      { timeout: 5000 }
    );

    // 结束计时
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // 获取输出框内容
    const outputContent = await page.evaluate(() => {
      return document.querySelector("output").textContent;
    });

    // 记录结果
    results.push({
      input1: 500,
      input2: i,
      output: outputContent,
      executionTime: executionTime,
    });

    console.log(
      `测试 #${i}: 输入 (500, ${i}) => 输出: ${outputContent}, 执行时间: ${executionTime.toFixed(
        2
      )}ms`
    );
  }

  // 将结果保存到文件
  fs.writeFileSync("test-results.json", JSON.stringify(results, null, 2));

  // 关闭浏览器
  await browser.close();

  // 计算统计信息
  calculateStatistics();
}

function calculateStatistics() {
  const executionTimes = results.map((r) => r.executionTime);
  const avgTime =
    executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
  const maxTime = Math.max(...executionTimes);
  const minTime = Math.min(...executionTimes);

  console.log("\n测试统计:");
  console.log(`总测试数: ${results.length}`);
  console.log(`平均执行时间: ${avgTime.toFixed(2)}ms`);
  console.log(`最长执行时间: ${maxTime.toFixed(2)}ms`);
  console.log(`最短执行时间: ${minTime.toFixed(2)}ms`);

  // 将统计信息也保存到文件
  const statistics = { totalTests: results.length, avgTime, maxTime, minTime };
  fs.writeFileSync("test-statistics.json", JSON.stringify(statistics, null, 2));
}

// 运行测试
runTest().catch((error) => {
  console.error("测试过程中出错:", error);
});
