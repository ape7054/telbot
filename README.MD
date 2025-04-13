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
├─backup                  # 备份目录，存放备份文件
│   
│      
├─core                   # 核心功能目录
│      bot.ts            # Telegram机器人主逻辑
│      config.ts         # 项目配置文件
│      fun.ts           # 机器人功能实现
│      index.ts         # 核心模块入口文件
│      init.ts         # 初始化配置
│      menu.ts         # 菜单组件实现
│      
├─handlers              # 处理器目录
│      MessageHandler.ts # 消息处理器
│      StateHandler.ts   # 状态处理器
│      
├─interface             # 接口定义目录
│      index.ts         # 接口定义入口文件
│      
├─services              # 服务模块目录
│  ├─mev                # MEV相关服务
│  │      mev.ts        # MEV服务实现
│  │      transaction.ts # MEV交易处理
│  │      
│  ├─swap               # 交易服务
│  │      pumpSwap.ts   # Pump交易服务
│  │      raydiumSwap.ts # Raydium交易服务
│  │      
│  └─tapchain           # Tapchain服务
│          tapchain.ts  # Tapchain服务接口
│          tapchain0.ts # Tapchain服务实现
│
├─test                  # 测试目录
└─utils                 # 工具类目录
        grpc.ts         # gRPC工具类
        transaction.ts  # 交易工具类