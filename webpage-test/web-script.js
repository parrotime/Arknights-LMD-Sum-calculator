const puppeteer = require("puppeteer");
const fs = require("fs");

// 创建结果存储数组
const results = [];

async function runTest() {
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50, //每个操作的延时设置为 50 毫秒
  });

  const page = await browser.newPage();

  // 导航到目标网页
  try {
    await page.goto(
      "https://parrotime.github.io/Arknights-LMD-Sum-calculator/",
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

  // 等待第一个输入框
  try {
    await page.waitForSelector(".input-group:nth-child(1) .input-box", {
      timeout: 2000,
    });
    console.log("找到第一个输入框");
  } catch (error) {
    console.error("未找到第一个输入框:", error);
    await browser.close();
    return;
  }

  // 输入 5000 到第一个输入框
  await page.evaluate(() => {
    const input = document.querySelector(
      ".input-group:nth-child(1) .input-box"
    );
    if (!input) throw new Error("第一个输入框不存在");
    input.value = "";
  });
  await page.type(".input-group:nth-child(1) .input-box", "5000");

  // 等待第二个输入框
  try {
    await page.waitForSelector(".input-group:nth-child(2) .input-box", {
      timeout: 2000,
    });
    console.log("找到第二个输入框");
  } catch (error) {
    console.error("未找到第二个输入框:", error);
    await browser.close();
    return;
  }

  // 测试范围调整
  for (let i = 0; i <= 200; i++) {
    // 清空并输入第二个值
    await page.evaluate(() => {
      const input = document.querySelector(
        ".input-group:nth-child(2) .input-box"
      );
      if (!input) throw new Error("第二个输入框不存在");
      input.value = "";
    });
    await page.type(".input-group:nth-child(2) .input-box", i.toString());

    // 点击“立即计算”
    await page.waitForSelector(".calculate-button");
    const startTime = performance.now();
    await page.click(".calculate-button");

    // 等待计算完成（检查结果框或路径渲染）
    try {
      await page.waitForFunction(
        () =>
          document.querySelector(".result-box").value !== "两者相差" ||
          document.querySelector(".path-renderer-container") ||
          document.querySelector(".path-renderer-error") ||
          document.querySelector(".error-message"),
        { timeout: 8000 } 
      );
    } catch (error) {
      console.error(`计算超时 (input2=${i}):`, error);
    }

    //const endTime = performance.now();
    //const executionTime = endTime - startTime;

    // 获取输出框内容
    const outputContent = await page.evaluate(() => {
      return document.querySelector(".result-box").value;
    });

    // 检查错误信息
    const errorMessage = await page.evaluate(() => {
      const error = document.querySelector(".error-message");
      return error ? error.innerText : null;
    });

    // 获取路径信息
    let pathContent = [];
    if (errorMessage) {
      pathContent = errorMessage;
    } else {
      try {
        await page.waitForSelector(
          ".path-renderer-container, .path-renderer-error",
          {
            timeout: 10000,
          }
        );
        const noPath = await page.evaluate(() => {
          return !!document.querySelector(".path-renderer-error");
        });

        if (noPath) {
          pathContent = "没有找到合适的路径";
        } else {
          pathContent = await page.evaluate(() => {
            const steps = document.querySelectorAll(".path-renderer-step-item");
            return Array.from(steps).map((step) => step.innerText.trim());
          });
        }
      } catch (error) {
        console.error(`获取路径出错 (input2=${i}):`, error);
        pathContent = "路径获取失败";
        await page.screenshot({ path: `error-path-${i}.png` });
      }
    }

    //获取路径后再计时
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // 记录结果
    results.push({
      input1: 5000,
      input2: i,
      output: outputContent,
      path: pathContent,
      executionTime: executionTime,
    });

    console.log(
      `测试 #${
        i 
      }: 输入 (5000, ${i}) => 输出: ${outputContent}, 执行时间: ${executionTime.toFixed(
        2
      )}ms, 路径: ${
        Array.isArray(pathContent) ? `${pathContent.length} steps` : pathContent
      }`
    );

    // 等待页面稳定
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 保存结果
  fs.writeFileSync(
    "test-results-0-200.json",
    JSON.stringify(results, null, 2)
  );

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

  fs.writeFileSync(
    "test-statistics-0-200.json",
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
