# 代理关系ABI功能说明：

### MarketAgent 合约维护Fufuture 代理推荐关系。新增代理关系时，该合约会发出对应的新增代理事件，代理关系确定后就不可修改。
### 分佣操作由交易合约执行，交易产生一笔佣金后，实时发送根据分佣比例所得佣金到代理钱包地址，同时发出佣金日志。供其他系统分析使用。

## 已部署合约

| 链名称      | Base                                    |                                       
|----------|--------------------------------------------|
| BManager | 0xfde4c96c8593536e31f229ea8f37b2ada2699bb2 |
| Broker   | 0xeCB891ebB10158654037403Dc702B0E200885770 |
| chain id | 8453                                       |
| rpc      | https://base-mainnet.public.blastapi.io/   |
| browser  | https://basescan.org/                      |

| 链名称    | Bsc                                       |                                       
|----------|--------------------------------------------|
| BManager | 0x2eA66eF91bF4CeBf05BbfaF0A4d623d70774a95B |
| Broker   | 0xb2Ca940f2E16167417863872Dfa73f0645dFB409 |
| chain id | 56                                         |
| rpc      | https://bsc-dataseed.binance.org/          |
| browser  | https://bscscan.org/                       |

| 链名称    | Conflux                                   |                                       
|----------|--------------------------------------------|
| BManager | 0xb3C0F0330A06dB0587eF4A6A283A1f117203871c |
| Broker   | 0xbe964767Bcf4c36C25F30D64D893E08Be4662d25 |
| chain id | 1030                                       |
| rpc      | https://evm.confluxrpc.com/                |
| browser  | https://evm.confluxscan.net/               |

| 链名称    | ENI                                                 |                                       
|----------|------------------------------------------------------|
| BManager | 0x09cD4951c43D609Ce01E8A05816537bB17eb1788           |
| Broker   | 0xE74FDDd83d848e9611F84324b893f6f7241fB010           |
| chain id | 173                                                  |
| rpc      | https://rpc.eniac.network/                           |
| browser  | https://scan.eniac.network/                          |

| 链名称    | XLayer                                          |                                       
|----------|--------------------------------------------------|
| BManager | 0x09cD4951c43D609Ce01E8A05816537bB17eb1788       |
| Broker   | 0xE74FDDd83d848e9611F84324b893f6f7241fB010       |
| chain id | 196                                              |
| rpc      | https://xlayerrpc.okx.com/                       |
| browser  | https://web3.okx.com/zh-hans/explorer/x-layer/   |

```angular2html
   Broker 表示代理合约
```

- 新增代理关系事件
```
  事件原型：
  event addInviterRelation(
    address token, 
    address inviter, 
    address invitee
  );
  该事件由 Broker 合约发出。
```
  | 序号  | 参数           | 类型              | 描述                        |
  |------|--------------|------------------|---------------------------|
  | 1    | token        | address          | 保留字段，现值为零地址，表示该对应关系适合所有币种 |
  | 2    | inviter      | address          | 上级代理地址                    |
  | 3    | invitee      | address          | 下级代理地址或交易员地址              |

- 交易佣金发送事件
```
  事件原型：
  event TransactionHistory(
    address indexed token,
    address indexed sender,
    address indexed received,
    TransactionType transactionType,
    uint256 amount,
    uint256 timestamp
  );
  该事件有具体的交易合约发出，交易合约地址是个动态合约地址。 
```
| 序号  | 参数             | 类型      | 描述                                            |
|------|-----------------|---------|-----------------------------------------------|
| 1    | token           | address | 佣金代币 oken                                     |
| 2    | sender          | address | 产生佣金钱包地址                                      |
| 3    | received        | address | 接收佣金地址，一般是代理钱包地址                              |
| 4    | transactionType | uint8   | 值为 17，表示发送给白名单的佣金，对Loop 来说，只关注值 17 就可以了，其它值忽略 |
| 5    | amount          | uint256 | 佣金代币数量                                      |
| 6    | timestamp       | uint256 | 发生时间                                          |
