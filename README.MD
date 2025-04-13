# 配置说明

## 1. 代理配置
- 代理服务器配置位于 `bot.ts` 文件中
- 如不需要代理服务，可移除相关配置项

## 2. 节点配置
- 节点相关参数配置位于 `init.ts` 文件中
- 可根据实际运行环境调整配置参数

## 3. 环境变量配置
- 环境变量定义在项目根目录 `.env` 文件中
- 请根据实际情况修改相关配置值

## 项目结构
C:\USERS\14690\DESKTOP\TELBOT\SRC
├─core                    # 核心功能模块
│   ├─bot.ts             # 机器人主文件
│   ├─config.ts          # 配置文件
│   └─init.ts            # 初始化逻辑
│
├─handlers               # 处理器模块
│   ├─MessageHandler.ts  # 消息处理
│   └─StateHandler.ts    # 状态处理
│
├─services              # 业务服务模块
│   ├─swap              # 交易相关
│   │   ├─pumpSwap.ts
│   │   └─raydiumSwap.ts
│   │
│   ├─mev               # MEV 相关
│   │   ├─mev.ts
│   │   └─transaction.ts
│   │
│   └─tapchain          # Tapchain 相关
│       ├─tapchain.ts
│       └─tapchain0.ts
│
├─utils                 # 工具函数
│   ├─grpc.ts
│   └─transaction.ts
│
├─interfaces           # 类型定义
│   └─index.ts
│
└─test                # 测试目录
    └─index.test.ts
