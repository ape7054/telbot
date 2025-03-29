import { createClient } from 'redis';

async function testRedis() {
    const client = createClient({
        url: 'redis://:tapai123456@localhost:7001'
    });

    client.on('error', err => console.log('Redis Client Error', err));
    await client.connect();

    // 获取所有以 amm: 开头的键
    const keys = await client.keys('amm:*');
    console.log('找到的AMM键:', keys);

    // 如果有键，显示第一个键的数据
    if (keys.length > 0) {
        const data = await client.hGetAll(keys[0]);
        console.log('数据示例:', data);
    }

    await client.quit();
}

testRedis().catch(console.error);