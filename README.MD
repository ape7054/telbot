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
📦 telbot
└── 📂 src
    ├── 📂 menus           # 菜单相关模块
    │   ├── 📄 main.ts      # 主菜单
    │   ├── 📄 trade.ts     # 交易相关菜单
    │   ├── 📄 snipe.ts     # 狙击相关菜单
    │   ├── 📄 follow.ts    # 跟单相关菜单
    │   └── 📄 settings.ts  # 设置相关菜单
    ├── 📂 services        # 业务逻辑层
    │   ├── 📄 trade.ts     # 交易相关业务
    │   ├── 📄 snipe.ts     # 狙击相关业务
    │   └── 📄 follow.ts    # 跟单相关业务
    ├── 📂 utils           # 工具函数
    │   ├── 📄 redis.ts     # Redis 工具类
    │   └── 📄 decimal.ts   # 数字处理工具
    ├── 📂 config          # 配置文件
    │   ├── 📄 redis.ts     # Redis配置
    │   └── 📄 bot.ts       # 机器人配置
    └── 📂 types           # 类型定义
        └── 📄 index.ts     # 公共类型定义
