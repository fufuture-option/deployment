# 合约ABI 功能说明：

## 1、BManager.json 是整个系统合约地址入口。 管理所有的交易币对，运行时用到的 Perpetual、 OrderBook、 TradeAgent、Underlying、 PrivatePool 合约地址都是该合约获取。

### 函数名称：getSettleList

- 列出已上币token列表，只返回token地址。可根据改token地址， 获取到其它信息。比如name、symbol、decimals等。
- 输入参数： 无
- 输出参数：

  | 序号 | 参数                |  描述      |
  |----|-------------------|---------|
  | 1  |  address[] memory |  已上币地址数组    |


### 函数名称：getTradePoolUnit

- 获取所有交易合约地址信息
- 输入参数：无
- 输出参数：无

  | 序号 | 参数                | 描述          |
  |----|-------------------|-------------|
  | 1  |  TradePoolUnit[] memory | 已部署交易合约地址明细 |
  - TradePoolUnit 结构字段是说明
  
      | 序号  | 参数          | 类型             | 描述                         |
      |-----|--------------|----------------|----------------------------|
      | 1   |  creator| address        | 创建交易对钱包地址                  |
      | 2   |  settle| address        | 结算币地址                      |
      | 3   |  decimals| uint256        | 结算币小数精度                    |
      | 4   |  settleName| string         | 交易对别名，可以和 symbol 一样，用户自己维护 |
      | 5   |  symbol| string         | 结算币名称                      |
      | 6   |  privatePool| PrivatePool 合约 | 私池合约, 提供私池充提功能             |
      | 7   |  perpetual| Perpetual 合约   | 交易合约。 提供开平仓、限价单、爆仓等接口      |
      | 8   |  orderBook| OrderBook         | 订单合约。 提供用户持仓、成交单、限价单等查询功能  |
      | 8   |  tradeAgent| TradeAgent         | 交易代理合约。提供 最大可开、最大可用等查询接口   
      | 10 |  tradeStation| TradeStation         | 交易代理合约。提供触发限价单等功能          |

# 流动性管理
## 私池流动性管理功能由 PrivatePool 合约提供
### 函数名称 provide
- 用户手动充私池，提供交易流动性
- 输入参数：

  | 序号  | 参数          | 类型             | 描述                         |
  |-----|--------------|----------------|----------------------------|
  | 1   |  amount| uint256        | 充结算数量                      |
  | 2   |  priOrPub| uint256        | 充币类型 1、公池 2、私池。 公池暂时禁用     |

### 函数名称 withdraw
- 用户手动充私池，提取交易流动性
- 输入参数：

  | 序号  | 参数          | 类型             | 描述                                  |
  |-----|--------------|----------------|-------------------------------------|
  | 1   |  amount| uint256        | 提结算数量。 对私池来说，该值为提取数量，对公池来说，该值为提取的份额 |
  | 2   |  priOrPub| uint256        | 充币类型 1、公池 2、私池。 公池暂时禁用              |

### 函数名称 getLP2Account
- 查询用户流动池资产数据
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
  | 8   |  autoAddMargin| bool         | 爆仓时候，是否自动追加保证金                
  | 10 |  isRejectOrder| bool         | 表示接单状态。 true 为拒绝接单，Fasle 可以接单 |

## 交易合约接口

