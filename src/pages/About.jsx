import React from 'react';
import styles from '../assets/styles/About.module.css';

function AboutPage() {
  return (
    <div className={styles['main-about-content']}>
        <div className={styles['about-page']}>
          <h1>关于</h1>

          <div className={styles['notice-list']}>
            <div className={styles['notice-item']}>
              <div className={styles['notice-title']}>当前版本v1.1.3</div>
              <div className={styles['notice-content']}>
                1.
                本网页是作者入门前端三件套和react框架的一个练习项目，没什么技术含量，存在不足之处，欢迎提出改进意见orz
                <br />
                2. 如果遇到问题，请通过B站私信反馈
                <a
                  href="https://space.bilibili.com/32772539"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['external-link3']}
                >
                  网页作者B站主页
                </a>
                <br />
                3. 网页源码：
                <a
                  href="https://github.com/parrotime/Arknights-LMD-Sum-calculator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['external-link3']}
                >
                  github项目源码
                </a>
                <br />
                4. 本网页中所有数据与图片均来自于
                <a
                  href="https://prts.wiki/w/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['external-link3']}
                >
                  PRTS wiki
                </a>
                官网，所有迷迭香表情包均出自NGA
                <a
                  href="https://ngabbs.com/read.php?tid=26714373"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['external-link3']}
                >
                  [嵌字烤肉][授权]好猫咪！！！(By
                  coconattsu_corn)(大量迷迭香/博士表情包)(更新了十多张)
                </a>
                。如有侵权，请联系删除。
                <br />
                5. 参考文献：
                <br />
                （1）
                <a
                  href="https://bbs.nga.cn/read.php?tid=21247901"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['external-link3']}
                >
                  公招需要花费龙门币时代的另一位作者的凑数计算器NGA帖子
                </a>
                ，也就是熟知的 https://cedric341561.gitee.io/777/
                （似乎已经失效）
                <br />
                （2）
                <a
                  href="https://ngabbs.com/read.php?tid=16847042"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['external-link3']}
                >
                  干员升级经验及龙门币消耗成本统计(收束测试)
                </a>
                <br />
              </div>

              <div className={styles['notice-title']}>声明</div>
              <div className={styles['notice-content']}>
                网页所涉及的游戏《明日方舟》相关的名称、数据、素材、表情包等均为其各自所有者的资产，仅供识别。
                <br />
                网页内使用的游戏图片素材、文本，仅用于介绍与说明，其版权均属于上海鹰角网络科技有限公司。
                <br />
                本项目为无偿开源项目，以便于明日方舟玩家能够凑出想要的龙门币数量，仅用于学习交流使用。
                <br />
                <br />
              </div>

              <div className={styles['notice-title']}>时间轴</div>
              <div className={styles['notice-content']}>
                2025年4月19日 --- 【v1.0.0】 版本上线。
                <br />
                2025年4月20日 ---【v1.1.0】
                处理了“当前和目标输入同一个值会显示无合适路径”的问题；处理了“路径中'当前龙门币'数量为负数”情况的问题。
                感谢B站评论区捉虫。
                <br />
                2025年7月5日 ----【v1.1.1】
                把“路径切换按钮”改到路径的上方，这样它就不会乱跑了；优化了彩蛋和其他内容，感谢B站评论区反馈。
                <br />
                2025年8月7日 ----【v1.1.2】
                优化了设置区域的排版；对路径中“使用作战记录”有关步骤的文本内容进行了修改以避免歧义，感谢B站评论区反馈。
                <br />
                2025年10月9日 ---- 【v1.1.3】
                修改了主页下方排版和一些文本内容。
                <br />
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

export default AboutPage;