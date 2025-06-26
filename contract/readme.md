# 合约ABI 功能说明：

## 1、BManager.json 是整个系统合约地址入口。 管理所有的交易币对，运行时用到的 Perpetual、 OrderBook、 TradeAgent、Underlying、 PrivatePool 合约地址都是该合约获取。

## BManager 合约地址：0xB012A210793488e1bcD4bb8e6Be2Cb9c04d4d722， 可用链 OPBnb Test

### 函数名称getSettleList

- 列出已上币token列表，只返回token地址。可根据改token地址， 获取到其它信息。比如name、symbol、decimals等。
- 输入参数： 无
- 输出参数：

  | 序号 | 参数                |  描述      |
  |----|-------------------|---------|
  | 1  |  address[] memory |  已上币地址数组    |

### 获取所有交易合约地址信息

- 函数名称：getTradePoolUnit
- 输入参数：无
- 输出参数：

  | 序号 | 参数                | 描述          |
  |----|-------------------|-------------|
  | 1  |  TradePoolUnit[] memory | 已部署交易合约地址明细 |

- TradePoolUnit 结构字段是说明

  | 序号 | 参数          | 类型             | 描述                         |
  |----|--------------|----------------|----------------------------|
  | 1  |  creator| address        | 创建交易对钱包地址                  |
  | 2  |  settle| address        | 结算币地址                      |
  | 3  |  decimals| uint256        | 结算币小数精度                    |
  | 4  |  settleName| string         | 交易对别名，可以和 symbol 一样，用户自己维护 |
  | 5  |  symbol| string         | 结算币名称                      |
  | 6  |  privatePool| PrivatePool 合约 | 私池合约, 提供私池充提功能             |
  | 7  |  perpetual| Perpetual 合约   | 交易合约。 提供开平仓、限价单、爆仓等接口      |
  | 8  |  orderBook| OrderBook         | 订单合约。 提供用户持仓、成交单、限价单等查询功能  |
  | 9  |  tradeAgent| TradeAgent         | 交易代理合约。提供 最大可开、最大可用等查询接口   |
  | 10 |  tradeStation| TradeStation         | 交易代理合约。提供触发限价单等功能          |

### 获取所有underlying合约地址信息

- 函数名称：getUnderlying
- 输入参数：无
- 输出参数：

  | 序号 | 参数                    | 描述                      |
  |----|-----------------------|-------------------------|
  | 1  | string[]  names     | 交易对列表，值是BTC ETH         |
  | 2  | address[] addresses | 交易列表对应的 Underlying 合约地址 |

# 交易对信息合约

## 交易对的基础信息，包括最小下单单位、手续费率、维持保证金率、挂单奖励等

### 获取单个合约交易对的基础信息

- 函数名称: getSettleDetail
- 输入参数：

  | 序号 | 参数      | 类型         | 描述        |
  |----|---------|---------|----------------| 
  | 1 | primary | address | TradePoolUnit 结构中的 perpeutal字段值。 |

- 输出参数:

  | 序号 | 参数      | 类型   | 描述           |
  |----|---------|------------|---------| 
  | 1 | item | PrimaryMultiItem | 合约交易对的基础参数信息，字段结构详情见下方说明 |

  PrimaryMultiItem 结构说明

  | 序号 | 参数          | 类型           | 描述                              |
  |----|--------------|--------------|---------------------------------|
  | 1  |  name| string       | 交易对别名，可自定义，一般情况下 就是结算币的 name 属性 |
  | 2  |  multi| uint256      | 转换系数                            |
  | 3  |  settle| address      | 结算币地址                           |
  | 4  |  primary| address      | 交易合约。 提供开平仓、限价单、爆仓等接口           |
  | 5  |  privatePool| address      | 私池地址                            |
  | 6  |  tradeAgent| address      | 交易辅助合约，提供一些查询功能                 |
  | 7  |  orderBook| address   | 订单合约。 提供用户持仓、成交单、限价单等查询功能       |
  | 8  |  station| address    | 交易辅助合约，主要执行限价单功能                |
  | 9  |  tradingFeeRate| uint256   | 手续费率                            |       
  | 10 |  rewardGas| uint256 | 挂单奖励费                           |
  | 11 |  minOrderAmount| uint256 | 最小下单单位                        |
  | 12 |  leverage| uint256 | 默认杠杠倍数                          |
  | 13 |  lotMulti| uint256 | 交易数量调整系数           |
  | 14 |  version| uint256 | 版本号                             |
  | 15 |  status| uint256 | 交易状态 0-正常 1-涨停 2-下架             |

### 获取交易对内所有交易合约的基础信息

- 函数名称: getSettles
- 输入参数：无
- 输出参数:

  | 序号 | 参数    | 类型                   | 描述                       |
    |----|-------|----------------------|--------------------------| 
  | 1 | items | PrimaryMultiItem[] | 合约交易对的基础参数信息，字段结构详情见上方说明 |

# 流动性管理

## 私池流动性管理功能由 PrivatePool 合约提供

### 用户手动充私池，提供交易流动性

- 函数名称 provide
- 输入参数：

  | 序号  | 参数          | 类型             | 描述                         |
  |-----|--------------|----------------|----------------------------|
  | 1   |  amount| uint256        | 充结算数量                      |
  | 2   |  priOrPub| uint256        | 充币类型 1、公池 2、私池。 公池暂时禁用     |
- 关联事件  
  event Provide(address indexed account, uint256 amount, uint256 poolType);

  | 序号 | 参数          | 类型             | 描述                     |
  |----|--------------|----------------|------------------------|
  | 1  |  account| address        | 充结算用户钱包地址              |
  | 2  |  amount| uint256        | 充币金额                   |
  | 3  |  poolType| uint256        | 池子类型 1、公池 2、私池。  |

### 用户手动提取交易流动性

- 函数名称 withdraw
- 输入参数：

  | 序号  | 参数          | 类型             | 描述                                  |
  |-----|--------------|----------------|-------------------------------------|
  | 1   |  amount| uint256        | 提结算数量。 对私池来说，该值为提取数量，对公池来说，该值为提取的份额 |
  | 2   |  priOrPub| uint256        | 充币类型 1、公池 2、私池。 公池暂时禁用              |

- 关联事件  
  event Withdraw(address indexed account, uint256 amount, uint256 poolType);

  | 序号 | 参数          | 类型             | 描述                     |
  |----|--------------|--------|---------------|
  | 1  |  account| address        | 充结算用户钱包地址              |
  | 2  |  amount| uint256        | 充币金额                   |
  | 3  |  poolType| uint256        | 池子类型 1、公池 2、私池。  |

### 查询用户流动池资产数据

- 函数名称 getLP2Account
- 输入参数：

  | 序号  | 参数          | 类型             | 描述                     |
  |-----|--------------|----------------|------------------------|
  | 1   |  maker| address        | maker 用户地址             |
- 输出参数：

  | 序号  | 参数   | 类型             | 描述           |
  |-----|------|----------------|--------------|
  | 1   | info | LP2Account        | maker 用户资产数据 |

  LP2Account 结构说明：

  | 序号  | 参数          | 类型             | 描述                            |
  |-----|--------------|----------------|-------------------------------|
  | 1   |  holder| address        | 用户私池地址                        |
  | 2   |  amount| uint256        | 期初资产数量，包含未结算盈亏                |
  | 3   |  availableAmount| uint256        | 可用数量。可用来接单金额                  |
  | 4   |  lockedAmount| uint256         | 已接接单数量，属于冻结数量                 |
  | 5   |  maintenanceMargin| uint256         | 爆仓时候，转入风险保证金账号，未爆仓，结算时候返回用户   |
  | 6   |  marginRate| uint256 | 用户自定义保证金比例。                   |
  | 7   |  maintenanceMarginRate| uint256   | 用户自定义维持保证金比例。                 |
  | 8   |  addMarginRate| uint256         | 用户自动追加保证金比例                   |
  | 8   |  autoAddMargin| bool         | 爆仓时候，是否自动追加保证金          |      
  | 10 |  isRejectOrder| bool         | 表示接单状态。 true 为拒绝接单，Fasle 可以接单 |

-----------------------------------------------

## Perpetual 合约交易接口

    交易合约提供用户充提资金、市价开平仓、限价挂撤单、执行限价单、爆仓等功能 

### 用户充入资金

- 函数名称 deposit
- 输入参数：

  | 序号  | 参数          | 类型             | 描述         |
  |-----|--------------|----------------|------------|
  | 1   |  _amount| uint256        | 充入token 数量 |

- 关联事件 event TransactionHistory(address indexed taker, TransactionType transactionType, uint256 amount, uint256
  timestamp);

| 序号 | 参数              | 类型              | 描述            |
|----|-----------------|-----------------|---------------|
| 1  | taker           | address         | 持有token 的钱包地址 |
| 2  | transactionType | TransactionType | 1、充入  2 提取    |
| 3  | amount          | uint256         | 操作 token 数量   |
| 4  | timestamp       | uint256         | 操作时间          |

### 用户提取资金

- 函数名称 withdraw
- 输入参数：

  | 序号  | 参数          | 类型             | 描述              |
  |-----|--------------|----------------|-----------------|
  | 1   |  _amount| uint256        | 提取token 数量      |
  | 1   |  _symbols| string[] memory        | 交易对数组 [btc,eth] |
  | 1   |  _priceUpdate| bytes[] calldata  | 交易对对应的加密字节数组    |

- 关联事件 event TransactionHistory(address indexed taker, TransactionType transactionType, uint256 amount, uint256
  timestamp);

| 序号 | 参数              | 类型              | 描述            |
|----|-----------------|-----------------|---------------|
| 1  | taker           | address         | 持有token 的钱包地址 |
| 2  | transactionType | TransactionType | 1、充入  2 提取    |
| 3  | amount          | uint256         | 操作 token 数量   |
| 4  | timestamp       | uint256         | 操作时间          |

### 查询用户资产

- 函数名称 getUserAccount
- 输入参数:

  | 序号  | 参数           | 类型             | 描述              |
  |-----|--------------|----------------|-----------------|
  | 1   | _taker       | address        | 用户钱包地址          |
- 输出参数

  | 序号  | 参数   | 类型             | 描述     |
  |-----|------|----------------|--------|
  | 1   | info | AccountInfo        | 用户资产结构 |

  AccountInfo 结构说明

  | 序号 | 参数   | 类型             | 描述     |
  |----|------|----------------|--------|
  | 1  | depositAmount | uint256        | 期初资产金额 |
  | 2  | availableAmount | uint256        | 用户可用资金 |
  | 3  | marginAmount | uint256        | 已用保证金  |
  | 4  | orderLocked | uint256        | 占用清算资金 |
  | 5  | lastTime | uint256        | 最后更新时间 |

### 开仓

- 函数名称 tradeFutures
  输入参数：

  | 序号 | 参数      | 类型             | 描述                         |
  |----|----------|----------------|----------------------------|
  | 1  |  _name| string        | 交易对名称 BTC 之类，大写            |
  | 2  |  _amount| uint256        | 下单数量                       |
  | 3  |  _price| uint256  | 下单，市价填 0， 限价填具体价格，小数位数 18位 |
  | 4  |  _orderType| uint256  | 价格类型， 市价填0 ，限价 填1          |
  | 5  |  _type| uint256  | 多空方向 多单 1， 空单 2            |
  | 6  |  _inviter| address  | 代理地址，无代理可为空地址              |
  | 7  |  _goodTill| uint256  | 市价无意义，限价单位有效期， 单位 秒        |
  | 8  |  _deadline| uint256  | 订单有效时间                     |  
  | 9  |  _priceUpdate| bytes  | 价格认证加密byte，限价无意义，可为空       |

- 关联事件
  - 市价单发 event OrderHistory(address indexed taker, string name,uint256 orderID, Direct direction, OrderType
    orderType, uint256 amount, uint256 costPrice, uint256 price,uint256 tradingFee, uint256 limitOrderId, uint256
    timestamp);

  | 序号 | 参数 | 类型             | 描述                      |
  |----|--|----------------|-------------------------|
  | 1  |  taker| address        | 成交订单钱包地址                |
  | 2  |  name| string         | 订单交易对名称                 |
  | 3  |  orderID| uint256  | 成交单号                    |
  | 4  |  direction| uint256  | 多空方向， 1 多，2 空           |
  | 5  |  orderType| uint256  | 市价开 1 ，限价开 2            |
  | 6  |  amount| uint256  | 成交数量                    |
  | 7  |  costPrice| uint256  | 成本价                     |
  | 8  |  price| uint256  | 成交价格 为零                 |  
  | 9  |  tradingFee| uint256  | 手续费                     |
  | 10 |  limitOrderId| uint256  | 挂单订单号，市价成交为 uint256.max |
  | 11 |  timestamp| uint256  | 订单成交时间                  |
  OrderBook 合约发出

  - 限价单发 event CreateLimitedOrder(string name, address indexed taker, uint256 orderID, Direct orderType,
    OrderState state, Offset offset, uint256 amount, uint256 targetPrice, uint256 margin, uint256 extraFee, uint256
    tradingFee, uint256 goodTill );

  | 序号  | 参数 | 类型       | 描述              |
  |-----|--|----------|-----------------|
  | 1   |  name| string   | 交易对名称 BTC 之类，大写 |
  | 2   |  taker| address  | 挂单钱包地址          |
  | 3   |  orderID| uint256  | 挂单号             |
  | 4   |  orderType| uint256  | 多空方向 1 多  2 空   |
  | 5   |  state| uint256  | 挂单状态 值为 1，挂单中   |
  | 6   |  offset| uint256  | 值为 1 表示开仓       |
  | 7   |  amount| uint256  | 挂单数量            | 
  | 8   |  targetPrice| uint256  | 挂单价格            |
  | 9   |  margin| uint256  | 冻结保证金           |- 
  | 10  |  rewardGas| uint256  | 触发奖励            |
  | 11  |  tradingFee| uint256  | 冻结手续费           |
  | 12 |  goodTill | uint256  | 有效期             |
  OrderBook 合约发出

### 平仓

- 函数名称 closePosition
  输入参数：

  | 序号 | 参数      | 类型             | 描述                         |
  |----|----------|----------------|----------------------------|
  | 1  |  _name| string        | 交易对名称 BTC 之类，大写            |
  | 2  |  _amount| uint256        | 下单数量                       |
  | 3  |  _orderType| uint256  | 价格类型， 市价填0 ，限价 填1          |- 
  | 4  |  _price| uint256  | 下单，市价填 0， 限价填具体价格，小数位数 18位 |
  | 5  |  _type| uint256  | 多空方向 多单 1， 空单 2            | 
  | 6  |  _goodTill| uint256  | 市价无意义，限价单位有效期， 单位 秒        |
  | 7  |  _deadline| uint256  | 订单有效时间                     |  
  | 8  |  _priceUpdate| bytes  | 价格认证加密byte，限价无意义，可为空       |

- 关联事件
  - 市价单发 event OrderHistory(address indexed taker, string name,uint256 orderID, Direct direction, OrderType
    orderType, uint256 amount, uint256 costPrice, uint256 price,uint256 tradingFee, uint256 limitOrderId, uint256
    timestamp);

  | 序号 | 参数 | 类型             | 描述            |
  |----|--|----------------|---------------|
  | 1  |  taker| address        | 成交订单钱包地址      |
  | 2  |  name| string         | 订单交易对名称       |
  | 3  |  orderID| uint256  | 成交单号          |
  | 4  |  direction| uint256  | 多空方向， 1 多，2 空 |
  | 5  |  orderType| uint256  | 不分市价还是限价，都是 3 |
  | 6  |  amount| uint256  | 成交数量          |
  | 7  |  costPrice| uint256  | 平仓成本价     |
  | 8  |  price| uint256  | 成交价格          |  
  | 9  |  tradingFee| uint256  | 手续费           |
  | 10 |  limitOrderId| uint256  | 挂单订单号，市价成交为零  |
  | 11 |  timestamp| uint256  | 订单成交时间        |
  OrderBook 合约发出

  - 限价单发 event CreateLimitedOrder(string name, address indexed taker, uint256 orderID, Direct orderType,
    OrderState state, Offset offset, uint256 amount, uint256 targetPrice, uint256 margin, uint256 extraFee, uint256
    tradingFee, uint256 goodTill );

  | 序号  | 参数 | 类型       | 描述              |
  |-----|--|----------|-----------------|
  | 1   |  name| string   | 交易对名称 BTC 之类，大写 |
  | 2   |  taker| address  | 挂单钱包地址    |
  | 3   |  orderID| uint256  | 挂单号       |
  | 4   |  orderType| uint256  | 多空方向 1 多  2 空   |
  | 5   |  state| uint256  | 挂单状态 值为 1，挂单中   |
  | 6   |  offset| uint256  | 值为 2 表示平仓仓      |
  | 7   |  amount| uint256  | 挂单数量     | 
  | 8   |  targetPrice| uint256  | 挂单价格   |
  | 9   |  margin| uint256  | 冻结保证金           |- 
  | 10  |  rewardGas| uint256  | 触发奖励     |
  | 11  |  tradingFee| uint256  | 冻结手续费     |
  | 12 |  goodTill | uint256  | 有效期     |
  OrderBook 合约发出

### 用户设置杠杠倍数

- 函数名称 setUserLeverage
- 输入参数

  | 序号 | 参数        | 类型             | 描述                  |
  |----|-----------|----------------|---------------------|
  | 1  | _name     | string        | 交易对名称 BTC ETH 之类，大写 |
  | 2  | _leverage | uint256        | 杠杆倍数 |

### 用户获取当前杠杠倍数

- 函数名称 getUserLeverage
- 输入参数

  | 序号 | 参数         | 类型             | 描述                  |
  |----|------------|----------------|---------------------|
  | 1  | _name      | string        | 交易对名称 BTC ETH 之类，大写 |

- 输出参数

  | 序号  | 参数      | 类型             | 描述   |
  |-----|---------|----------------|------|
  | 1   | uint256 | uint256        | 杠杆倍数 |

# OrderBook 订单合约接口

     订单、持仓、等用户持仓数据查询

### 查询用户有效挂单

- 函数名称 getUserLimitOrdersID
- 输入参数

  | 序号 | 参数         | 类型             | 描述       |
  |----|------------|----------------|----------|
  | 1  | _user      | address        | 挂单用户钱包地址 |

- 输出参数

  | 序号  | 参数     | 类型             | 描述         |
  |-----|--------|----------------|------------|
  | 1   | orders | uint256[] memory  | 用户有效挂单ID列表 |

### 查询挂单数据信息

- 函数名称 getLimitOrders
- 输入参数

  | 序号 | 参数     | 类型             | 描述        |
  |----|--------|----------------|-----------|
  | 1  | orders | uint256[]         | 带查询挂单ID列表 |

- 输出参数

  | 序号  | 参数     | 类型             | 描述             |
  |-----|--------|----------------|----------------|
  | 1   | info | LimitedOrder[] memory  | 用户有效挂单详细信息列表 |

  LimitedOrder 结构说明

  | 序号 | 参数           | 类型      | 描述                                      |
  |----|--------------|---------|-----------------------------------------| 
  | 1  | taker        | address | 挂单钱包地址                                  |
  | 2  | direct      | uint256 | 多空方向 1 多单，2空单                           |
  | 4  | state    | uint256 | 订单状态 1 挂当中  2 部分成交 3 完全成交 4 撤销 5过期 6 异常 |
  | 6  | offset       | uint256 | 值为 1 开仓 2 平仓                            |
  | 7  | name       | string  | 交易对名称 BTC ETH                           | 
  | 8  | amount  | uint256 | 挂单数量                                    |
  | 8  | targetPrice  | uint256 | 挂单价格                                    |
  | 9  | margin       | uint256 | 冻结保证金                                   |- 
  | 11 | tradingFee   | uint256 | 冻结手续费                                   |
  | 10 | rewardGas    | uint256 | 触发奖励                                    |
  | 12 | goodTill     | uint256 | 有效期                                     |

### 查询持仓数据信息

- 函数名称 positions
- 输入参数

  | 序号 | 参数     | 类型            | 描述             |
  |----|--------|---------------|----------------|
  | 1  | user   | address       | 用户持仓地址         |
  | 2  | name   | string | 交易对名称 BTC ETH  |
  | 3  | direct | uint256 | 多空方向 0 多单 1 空单 |

- 输出参数

  | 序号 | 参数     | 类型             | 描述        | 
  |----|--------|---------------|-----------|
  | 1  | value      | uint256 | 持仓成本      |
  | 4  | size    | uint256 | 持仓数量      |
  | 6  | margin       | uint256 | 持仓保证金     |
  | 7  | freeze       | uint256  | 平仓冻结数量    | 
  | 8  | deals  | uint256[] | 持仓对应的成交订单 |

# TradeAgent 合约接口

    提供一些查询类接口。比如最大可开、最大可取等

### 查询用户最大可取金额

- 函数名称 getMaxWithdrawableAmount
- 输入参数

  | 序号 | 参数       | 类型            | 描述            |
  |----|----------|---------------|---------------|
  | 1  | _user    | address       | 用户持仓地址        |
  | 2  | _symbols | string[] memory | 交易对名称 BTC ETH |
  | 3  | _prices   | uint256[] memory | 和交易对对应的市场价格   |

- 输出参数

  | 序号 | 参数     | 类型             | 描述     | 
  |----|--------|---------------|--------|
  | 1  | value      | uint256 | 最大可取数量 |

### 查询用户最大可开

- 函数名称 getMaxOpenAmount
- 输入参数

  | 序号 | 参数       | 类型            | 描述            |
  |----|----------|---------------|---------------|
  | 1  | _user    | address       | 用户持仓地址        |
  | 2  | _symbols | string memory | 交易对名称 BTC ETH |
  | 3  | _prices   | uint256 memory | 和交易对对应的市场价格   |

- 输出参数

  | 序号 | 参数     | 类型             | 描述     | 
  |----|--------|---------------|--------|
  | 1  | value      | uint256 | 最大可开数量 |
  
