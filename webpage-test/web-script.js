const puppeteer = require("puppeteer");
const fs = require("fs");

// 创建结果存储数组
const results = [];

async function runTest() {
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: false, // 设置为 false 以便观察
    slowMo: 50, // 放慢操作速度
  });

  const page = await browser.newPage();

  // 导航到目标网页
  try {
    await page.goto(
      "https://parrotime.github.io/Arknights-LMD-Sum-calculator/",
      //"http://localhost:3000/Arknights-LMD-Sum-calculator",
      {
        waitUntil: "networkidle2",
      }
    );
    console.log("页面加载完成");
  } catch (error) {
    console.error("页面加载失败:", error);
    await browser.close();
    return;
  }

  // 等待第一个输入框出现
  try {
    await page.waitForSelector(".input-group:nth-child(1) .input-box", {
      timeout: 5000,
    });
    console.log("找到第一个输入框");
  } catch (error) {
    console.error("未找到第一个输入框:", error);
    await page.screenshot({ path: "error-first-input.png" });
    await browser.close();
    return;
  }

  // 清空并输入1000到第一个输入框
  await page.evaluate(() => {
    const input = document.querySelector(
      ".input-group:nth-child(1) .input-box"
    );
    if (!input) throw new Error("第一个输入框不存在");
    input.value = "";
  });
  await page.type(".input-group:nth-child(1) .input-box", "100");

  // 等待第二个输入框出现
  try {
    await page.waitForSelector(".input-group:nth-child(2) .input-box", {
      timeout: 5000,
    });
    console.log("找到第二个输入框");
  } catch (error) {
    console.error("未找到第二个输入框:", error);
    await page.screenshot({ path: "error-second-input.png" });
    await browser.close();
    return;
  }

  // 对第二个输入框依次输入0~50的整数并记录结果
  for (let i = 100; i <= 500; i++) {
    // 清空第二个输入框
    await page.evaluate(() => {
      const input = document.querySelector(
        ".input-group:nth-child(2) .input-box"
      );
      if (!input) throw new Error("第二个输入框不存在");
      input.value = "";
    });

    // 输入当前值
    await page.type(".input-group:nth-child(2) .input-box", i.toString());

    // 点击“立即计算”按钮触发计算
    await page.waitForSelector(".calculate-button");
    const startTime = performance.now(); // 开始计时
    await page.click(".calculate-button");

    // 等待计算完成
    await page.waitForFunction(
      'document.querySelector(".result-box").value !== "两者相差"',
      { timeout: 10000 }
    );

    // 结束计时
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // 获取输出框内容
    const outputContent = await page.evaluate(() => {
      return document.querySelector(".result-box").value;
    });

    // 获取生成的路径信息
    let pathContent = [];
    try {
      await page.waitForSelector(".path-container", { timeout: 5000 });
      const noPath = await page.evaluate(() => {
        return !!document.querySelector(".path-error");//转为bool
      });

      if (noPath) {
        pathContent = "没有找到合适的路径";
      } else {
        pathContent = await page.evaluate(() => {
          const steps = document.querySelectorAll(".step_item");//获取路径所有步骤
          return Array.from(steps).map((step) => step.innerText.trim());
        });
      }
    } catch (error) {
      console.error(`获取路径出错 (input2=${i}):`, error);
      pathContent = "路径获取失败";
    }

    // 记录结果
    results.push({
      input1: 500,
      input2: i,
      output: outputContent,
      path: pathContent,
      executionTime: executionTime,
    });

    console.log(
      `测试 #${i}: 输入 (100, ${i}) => 输出: ${outputContent}, 执行时间: ${executionTime.toFixed(2)}ms, 路径: ${
        Array.isArray(pathContent) ? `${pathContent.length} steps` : pathContent
      }`
    );

    // 确保页面稳定
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 保存结果
  fs.writeFileSync("test-results.json", JSON.stringify(results, null, 2));

  // 关闭浏览器
  await browser.close();

  // 计算统计信息
  calculateStatistics();
}

function calculateStatistics() {
  const executionTimes = results.map((r) => r.executionTime);
  const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
  const maxTime = Math.max(...executionTimes);
  const minTime = Math.min(...executionTimes);

  console.log("\n测试统计:");
  console.log(`总测试数: ${results.length}`);
  console.log(`平均执行时间: ${avgTime.toFixed(2)}ms`);
  console.log(`最长执行时间: ${maxTime.toFixed(2)}ms`);
  console.log(`最短执行时间: ${minTime.toFixed(2)}ms`);

  fs.writeFileSync(
    "test-statistics.json",
    JSON.stringify(
      { totalTests: results.length, avgTime, maxTime, minTime },
      null,
      2
    )
  );
}

// 运行测试
runTest().catch((error) => {
  console.error("测试过程中出错:", error);
});
