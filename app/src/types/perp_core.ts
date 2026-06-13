/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/perp_core.json`.
 */
export type PerpCore = {
  "address": "9xFsNHYCBk1Zhar6ukRDrUyDipQS2zE9wDcFHj29q4t3",
  "metadata": {
    "name": "perpCore",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelLimitOrder",
      "docs": [
        "用户主动取消自己的 PENDING 挂单，退冻 + close PDA 退租。"
      ],
      "discriminator": [
        132,
        156,
        132,
        31,
        67,
        40,
        232,
        97
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleMint",
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "position",
          "docs": [
            "Position 仅对 LIMIT_CLOSE 类有意义（解冻 Position.freeze）；其他类型可传 None。"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "limitedOrder",
          "docs": [
            "要取消的 LimitedOrder —— 关闭 PDA 退租给 owner。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "docs": [
            "配对的 TriggerCondition —— 一并 close 退租。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "cancelLimitOrderArgs"
            }
          }
        }
      ]
    },
    {
      "name": "closePosition",
      "docs": [
        "用户平仓（仅 Market close + 单笔 DealRecord；批量由 client SDK 循环）。"
      ],
      "discriminator": [
        123,
        134,
        81,
        0,
        49,
        68,
        98,
        98
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleMint",
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "pairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "dealRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.deal_seq"
              }
            ]
          }
        },
        {
          "name": "priceUpdate",
          "docs": [
            "由 oracle 模块验证 discriminator + feed_id + staleness + conf。"
          ]
        },
        {
          "name": "switchboardFeed",
          "docs": [
            "Switchboard PullFeed 账户（v1.1 fallback）。"
          ]
        },
        {
          "name": "vaultAuthority",
          "docs": [
            "perp_core 端 vault_authority PDA —— 作为 CPI 进 liquidity_pool 的 signer。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "liquidityPoolProgram"
        },
        {
          "name": "poolConfig",
          "writable": true
        },
        {
          "name": "makerDeal",
          "writable": true
        },
        {
          "name": "lpAccount",
          "writable": true
        },
        {
          "name": "lpPosition",
          "docs": [
            "LpPosition 仅当 maker 是 escrow_authority 时需要传。"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "closePositionArgs"
            }
          }
        }
      ]
    },
    {
      "name": "collectTradeFee",
      "docs": [
        "把一笔 DealRecord 的 trading_fee CPI 切给 treasury。",
        "客户端 SDK 通常将此 ix 与 trade_futures / close_position 打包进同一 tx 实现\"原子收费\"。"
      ],
      "discriminator": [
        159,
        111,
        76,
        213,
        187,
        188,
        191,
        48
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "调用方（任意，付 CommissionAccount init_if_needed 租金）。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "dealRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.deal_seq"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "docs": [
            "perp_core vault_authority PDA —— 作为 treasury split_trade_fee 的 cpi_authority signer。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "sourceVault",
          "docs": [
            "perp_core vault token（fee 来源）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "treasuryProgram",
          "address": "JAX56qnm1CXf1zsMCfPAEscDLxgEZnYkNW7hsSdNX9xY"
        },
        {
          "name": "treasuryConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                255,
                6,
                231,
                244,
                231,
                159,
                5,
                8,
                8,
                31,
                131,
                255,
                141,
                169,
                91,
                177,
                30,
                40,
                156,
                45,
                113,
                98,
                55,
                149,
                173,
                69,
                193,
                25,
                126,
                184,
                188,
                117
              ]
            }
          }
        },
        {
          "name": "platformFeeVault",
          "docs": [
            "platform_fee_vault（treasury 端）。"
          ],
          "writable": true
        },
        {
          "name": "tradeFeeVault",
          "docs": [
            "trade_fee_vault（treasury 端）。"
          ],
          "writable": true
        },
        {
          "name": "treasuryVault",
          "docs": [
            "treasury_vault（累计佣金池）。"
          ],
          "writable": true
        },
        {
          "name": "inviteRelation",
          "docs": [
            "invite_relation（Option，taker 已绑定 inviter 时传）。"
          ],
          "optional": true
        },
        {
          "name": "commissionAccount",
          "docs": [
            "commission_account（Option，taker 已绑定 inviter 时传，init_if_needed）。"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "inviterInviteRelation",
          "docs": [
            "inviter A 的邀请关系（情况B：用于校验 A 的上级 B）。"
          ],
          "optional": true
        },
        {
          "name": "topAgent",
          "docs": [
            "top agent 白名单标记 PDA。"
          ],
          "optional": true
        },
        {
          "name": "topCommissionAccount",
          "docs": [
            "情况B 的 top agent 累计佣金账户（init_if_needed）。"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "collectTradeFeeArgs"
            }
          }
        }
      ]
    },
    {
      "name": "deposit",
      "docs": [
        "用户入金（SPL transfer 到 vault）。"
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleMint",
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "globalConfig",
          "docs": [
            "只读 — 取 min_deposit_amount 的 fallback 值。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "docs": [
            "只读 — 取 status + min_deposit_amount。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "docs": [
            "目标账户 — 必须事先由 `initialize_user_account` 创建。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "用户提供的 token account（owner 的 ATA 或任何持有 settle_mint 的账户）。"
          ],
          "writable": true
        },
        {
          "name": "vaultToken",
          "docs": [
            "Vault token account（由 vault_authority PDA 拥有；入金不需要 vault 签名）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "expireOrder",
      "docs": [
        "keeper 清理 good_till 已过的挂单，退冻给用户、reward_gas 给 keeper。"
      ],
      "discriminator": [
        174,
        27,
        85,
        247,
        105,
        245,
        220,
        13
      ],
      "accounts": [
        {
          "name": "keeper",
          "writable": true,
          "signer": true
        },
        {
          "name": "taker",
          "writable": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "keeperRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  101,
                  101,
                  112,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        },
        {
          "name": "position",
          "docs": [
            "仅 LIMIT_CLOSE 才需要（解 Position.freeze）。"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "limitedOrder",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "expireOrderArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initGlobalConfig",
      "docs": [
        "初始化全局配置（GlobalConfig + KeeperRegistry 两个 PDA）。",
        "部署后**第一笔**调用；重复调用会被 Anchor 的 `init` 约束拒绝。",
        "调用方 = 初始 admin（args.admin 决定后续 admin 权限）。"
      ],
      "discriminator": [
        140,
        136,
        214,
        48,
        87,
        0,
        120,
        255
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "出资创建账户的 payer；可以与 args.admin 不同（如热钱包 payer + 冷钱包 admin）。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "globalConfig",
          "docs": [
            "全局唯一的 GlobalConfig PDA。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "keeperRegistry",
          "docs": [
            "Keeper 白名单也在这里一并创建（同 admin 控制）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  101,
                  101,
                  112,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initGlobalConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initRiskFundVault",
      "docs": [
        "Admin 一次性创建给定 settle_mint 的风险基金 vault。"
      ],
      "discriminator": [
        254,
        58,
        132,
        55,
        232,
        49,
        34,
        23
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "settleConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "riskVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  105,
                  115,
                  107,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "riskVaultToken",
          "docs": [
            "风险基金 vault token account。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  105,
                  115,
                  107,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initSettleConfig",
      "docs": [
        "为某个 settle_mint 注册结算币配置（每币种一次）。",
        "创建 SettleConfig PDA + 派生 vault_authority bump（vault token 后续 ix 创建）。",
        "后续步骤：`init_settle_vault` → `init_risk_fund_vault`（D9）。"
      ],
      "discriminator": [
        190,
        65,
        89,
        155,
        0,
        202,
        236,
        245
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "docs": [
            "只读 — 校验 admin。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "settleMint"
        },
        {
          "name": "settleConfig",
          "docs": [
            "本 ix 创建的目标 PDA。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initSettleConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initSettleVault",
      "docs": [
        "创建给定结算币的 vault token account + SeqCounter PDA。",
        "每个 settle_mint 一次，admin 调用。"
      ],
      "discriminator": [
        21,
        87,
        166,
        130,
        118,
        176,
        248,
        119
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "docs": [
            "PDA 作为 vault token account 的 authority；不直接持有 token。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "vaultToken",
          "docs": [
            "Vault token account（由 vault_authority PDA 拥有）。",
            "PDA seed: [\"vault_token\", settle_mint] — 不用 ATA 公式，自定义 PDA 更可控。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "seqCounter",
          "docs": [
            "SeqCounter PDA：分配 deal_seq / order_seq。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  113,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeUserAccount",
      "docs": [
        "用户首次入金前显式创建 UserAccount PDA。"
      ],
      "discriminator": [
        131,
        248,
        61,
        211,
        152,
        205,
        122,
        238
      ],
      "accounts": [
        {
          "name": "owner",
          "docs": [
            "既是签名者也是租金 payer。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "settleConfig",
          "docs": [
            "仅校验 settle_mint 已被注册（防 owner 误传未注册 mint）。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "docs": [
            "目标 PDA — init 模式，同账户 init 第二次会被 Anchor 拒绝（防覆盖余额）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "liquidateTaker",
      "docs": [
        "keeper 强平一名 taker 的某笔 DealRecord（穿仓时从 risk fund 兜底）。"
      ],
      "discriminator": [
        107,
        24,
        220,
        204,
        193,
        65,
        149,
        91
      ],
      "accounts": [
        {
          "name": "keeper",
          "writable": true,
          "signer": true
        },
        {
          "name": "taker"
        },
        {
          "name": "settleMint"
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "keeperRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  101,
                  101,
                  112,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "pairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "dealRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.deal_seq"
              }
            ]
          }
        },
        {
          "name": "priceUpdate",
          "docs": [
            "由 oracle 模块验证 discriminator + feed_id + staleness。"
          ]
        },
        {
          "name": "switchboardFeed",
          "docs": [
            "Switchboard PullFeed 账户（v1.1 fallback）。"
          ]
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "riskVaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  105,
                  115,
                  107,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "riskVaultToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  105,
                  115,
                  107,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "vaultToken",
          "docs": [
            "perp_core vault token（接收 risk fund 补差）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "liquidityPoolProgram",
          "address": "2zRgfaNK4DCbbjHkd5pfaE9vwv9gnAP5DdeNDU8VWoTE"
        },
        {
          "name": "poolConfig",
          "writable": true
        },
        {
          "name": "makerDeal",
          "writable": true
        },
        {
          "name": "lpAccount",
          "writable": true
        },
        {
          "name": "lpPosition",
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "liquidateTakerArgs"
            }
          }
        }
      ]
    },
    {
      "name": "makeLimitClose",
      "docs": [
        "用户挂限价平仓单（LIMIT_CLOSE）。冻 Position.freeze + 冻 reward_gas。"
      ],
      "discriminator": [
        183,
        167,
        201,
        53,
        104,
        33,
        111,
        96
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleMint",
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "pairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "position",
          "docs": [
            "必须已有的 Position（kind=CLOSE 要冻结仓位）。"
          ],
          "writable": true
        },
        {
          "name": "seqCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  113,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "limitedOrder",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "makeLimitCloseArgs"
            }
          }
        }
      ]
    },
    {
      "name": "makeLimitOrder",
      "docs": [
        "用户挂限价开仓单（LIMIT_OPEN）。预冻结 margin+fee+reward_gas 到 order_locked。"
      ],
      "discriminator": [
        162,
        252,
        146,
        230,
        112,
        210,
        111,
        220
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleMint",
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "pairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "userLeverage",
          "docs": [
            "UserLeverage —— 与 trade_futures 一致，init_if_needed 默认走 pair.default_leverage。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  101,
                  118,
                  101,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "seqCounter",
          "docs": [
            "SeqCounter —— 分配 order_seq。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  113,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "limitedOrder",
          "docs": [
            "新 LimitedOrder PDA。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "docs": [
            "配对的 TriggerCondition PDA（LimitOpen 时 mean=INVALID，但仍 init 占位，",
            "便于 keeper / indexer 用一份查询拿全订单状态）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "makeLimitOrderArgs"
            }
          }
        }
      ]
    },
    {
      "name": "registerPair",
      "docs": [
        "admin 注册一个新的交易对（pair_id 全局唯一）。",
        "写入 PairConfig PDA：基础参数 + Pyth feed 元数据。",
        "重复注册同 pair_id 会被 Anchor `init` 拒绝；改字段走 `update_pair`。"
      ],
      "discriminator": [
        178,
        72,
        223,
        54,
        235,
        196,
        1,
        25
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "docs": [
            "只读 — 校验 admin。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "pairConfig",
          "docs": [
            "新 pair_config PDA — init 模式，重复注册同 pair_id 会被 Anchor 直接拒绝。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              }
            ]
          }
        },
        {
          "name": "payer",
          "docs": [
            "负责付租金；通常 = admin，但允许分离以便冷钱包 admin + 热钱包 payer。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "registerPairArgs"
            }
          }
        }
      ]
    },
    {
      "name": "setAddresses",
      "docs": [
        "admin 批量更新 GlobalConfig 可变字段（admin / 各 vault authority /",
        "LP+treasury program ID / mmr / 平台抽成比例等）。所有字段均 `Option`，",
        "None = 不变。也可在此完成 admin 转移（new_admin 字段）。"
      ],
      "discriminator": [
        211,
        64,
        104,
        178,
        32,
        193,
        197,
        170
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "docs": [
            "全局配置 PDA — 唯一目标账户。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "docs": [
            "当前 admin（需签名）。若 args.new_admin 非 None，本 ix 后将不再是 admin。"
          ],
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "setAddressesArgs"
            }
          }
        }
      ]
    },
    {
      "name": "setKeeper",
      "docs": [
        "admin 启用 / 禁用一个 keeper 地址（KeeperRegistry 白名单）。",
        "keeper 用于触发 trigger_*, expire_order, liquidate_taker 等非用户 ix。",
        "`enabled=true` 加入；`enabled=false` 移除。容量上限见 `KeeperRegistry::MAX_KEEPERS`。"
      ],
      "discriminator": [
        102,
        94,
        23,
        78,
        157,
        222,
        243,
        214
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "docs": [
            "只读 — 仅用来校验 admin signer。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "keeperRegistry",
          "docs": [
            "白名单 PDA — 实际被修改的目标。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  101,
                  101,
                  112,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "keeper",
          "type": "pubkey"
        },
        {
          "name": "enabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setUserLeverage",
      "docs": [
        "用户为特定 (settle_mint, pair_id) 设置自定义杠杆。",
        "首次调用自动创建 UserLeverage PDA；后续调用覆盖。"
      ],
      "discriminator": [
        11,
        222,
        122,
        157,
        174,
        128,
        203,
        243
      ],
      "accounts": [
        {
          "name": "owner",
          "docs": [
            "调用者（仓位所有者）。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint",
          "docs": [
            "结算币 mint（用于 PDA 推导，与 UserAccount 隔离不同结算币）。"
          ]
        },
        {
          "name": "pairConfig",
          "docs": [
            "交易对配置（用于校验 leverage 上限和 pair 状态）。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "pairId"
              }
            ]
          }
        },
        {
          "name": "userLeverage",
          "docs": [
            "UserLeverage PDA — 首次自动创建，后续覆盖。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  101,
                  118,
                  101,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "pairId"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "pairId",
          "type": "u16"
        },
        {
          "name": "leverage",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stopTakeOrder",
      "docs": [
        "用户挂条件单（STOP_TAKE_OPEN / STOP_TAKE_CLOSE）。只冻结 reward_gas。"
      ],
      "discriminator": [
        114,
        250,
        150,
        71,
        116,
        203,
        236,
        160
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleMint",
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "pairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "seqCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  113,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "position",
          "docs": [
            "CLOSE 路径必传：用户当前仓位（用于 adjustCloseParam 校验 TP/SL 方向）。",
            "OPEN 路径不需要（trigger 时仓位可能还不存在）。"
          ],
          "optional": true
        },
        {
          "name": "limitedOrder",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "stopTakeOrderArgs"
            }
          }
        }
      ]
    },
    {
      "name": "tradeFutures",
      "docs": [
        "用户开仓",
        "客户端必须：",
        "- 先读 `seq_counter.next_deal_seq` 并把它放进 `args.deal_seq`",
        "- 预选 1 个 LP（私有 LP 或 escrow_authority），传 `candidate_lp_account`"
      ],
      "discriminator": [
        238,
        109,
        166,
        154,
        192,
        118,
        250,
        80
      ],
      "accounts": [
        {
          "name": "owner",
          "docs": [
            "交易发起方 = position owner = user_account owner。"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleMint",
          "docs": [
            "结算币 mint（用于 PDA 推导和 fee 单位转换）。"
          ],
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "pairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "userLeverage",
          "docs": [
            "用户对该 pair 的自定义杠杆。首次开仓自动 init 为 pair.default_leverage；",
            "用户可在交易前先调 `set_user_leverage` 自定义。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  101,
                  118,
                  101,
                  114,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "position",
          "docs": [
            "Position PDA（按方向拆分）。首次该方向开仓自动 init。",
            "**Boxed** — Position 含 `deal_keys: Vec<Pubkey>` (max=32 → 1024 字节)，",
            "不 Box 会让 `try_accounts` 栈帧爆 4KB（sbf-solana-solana 限制）。"
          ],
          "writable": true
        },
        {
          "name": "seqCounter",
          "docs": [
            "全局序列号计数器（按 settle_mint 分）；mut 以便分配 deal_seq。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  113,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "dealRecord",
          "docs": [
            "DealRecord PDA — seeds 中含 `args.deal_seq`，handler 校验等于 seq_counter.next_deal_seq。",
            "**Boxed** — 同上，DealRecord 体积也较大。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.deal_seq"
              }
            ]
          }
        },
        {
          "name": "priceUpdate",
          "docs": [
            "Pyth `PriceUpdateV2` 账户。由用户在同一笔 tx 内通过 pyth_solana_receiver::post_update_atomic",
            "创建（短暂账户，tx 末尾 close 回收 rent）。Market 必传。",
            "**feed_id 校验**是防账户替换的核心防护（pair_config.pyth_feed_id 锁定该 pair 对应的价格源）。"
          ]
        },
        {
          "name": "switchboardFeed",
          "docs": [
            "Switchboard PullFeed 账户（v1.1 fallback）。",
            "`oracle_mode = AutoFallback` 时由 dispatcher 在 fallback 路径上做地址匹配 + 数据校验。"
          ]
        },
        {
          "name": "vaultAuthority",
          "docs": [
            "perp_core 端 vault_authority PDA —— 作为 CPI 进 liquidity_pool 的 signer。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "liquidityPoolProgram"
        },
        {
          "name": "poolConfig",
          "writable": true
        },
        {
          "name": "candidateLpAccount",
          "docs": [
            "Client 预选的 LP（私有 LP 或 escrow_authority LpAccount）。"
          ],
          "writable": true
        },
        {
          "name": "makerDeal",
          "docs": [
            "MakerDeal PDA — 由 liquidity_pool init，seed 含 deal_seq。"
          ],
          "writable": true
        },
        {
          "name": "lpPosition",
          "docs": [
            "LpPosition PDA — 仅当 LP 是 escrow_authority 时需要（公共池路径）。"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "tradeFuturesArgs"
            }
          }
        }
      ]
    },
    {
      "name": "triggerLimitClose",
      "docs": [
        "keeper 触发 LIMIT_CLOSE（价格穿透 target_price 时按当前价平指定 deal）。",
        "v1 约定：`limited_order.amount <= deal.remaining`，单笔 LimitedOrder 必须一次性 full close。"
      ],
      "discriminator": [
        205,
        210,
        202,
        247,
        180,
        211,
        81,
        7
      ],
      "accounts": [
        {
          "name": "keeper",
          "writable": true,
          "signer": true
        },
        {
          "name": "taker",
          "writable": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "keeperRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  101,
                  101,
                  112,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "dealRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.deal_seq"
              }
            ]
          }
        },
        {
          "name": "limitedOrder",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "priceUpdate",
          "docs": [
            "oracle 模块用 LimitedOrder 创建时快照的 pyth_feed_id 校验内容。"
          ]
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "liquidityPoolProgram",
          "address": "2zRgfaNK4DCbbjHkd5pfaE9vwv9gnAP5DdeNDU8VWoTE"
        },
        {
          "name": "poolConfig",
          "writable": true
        },
        {
          "name": "makerDeal",
          "writable": true
        },
        {
          "name": "lpAccount",
          "writable": true
        },
        {
          "name": "lpPosition",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "triggerLimitCloseArgs"
            }
          }
        }
      ]
    },
    {
      "name": "triggerLimitOpen",
      "docs": [
        "keeper 触发 LIMIT_OPEN（价格穿透 target_price 时）。"
      ],
      "discriminator": [
        36,
        81,
        232,
        10,
        246,
        64,
        233,
        7
      ],
      "accounts": [
        {
          "name": "keeper",
          "docs": [
            "keeper 调用方 —— 必须在 KeeperRegistry 白名单内。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "taker",
          "docs": [
            "同时也是 reward_gas SPL 转出的\"sender\"标识（事件用）。"
          ],
          "writable": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "keeperRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  101,
                  101,
                  112,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "pairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "limited_order.pair_id",
                "account": "limitedOrder"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        },
        {
          "name": "position",
          "docs": [
            "Position PDA —— 触发时初始化（首次该方向开仓）或累加。"
          ],
          "writable": true
        },
        {
          "name": "dealRecord",
          "docs": [
            "新 DealRecord（trigger 后才创建）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.deal_seq"
              }
            ]
          }
        },
        {
          "name": "limitedOrder",
          "docs": [
            "要触发的 LimitedOrder —— close 退租给 taker。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "priceUpdate",
          "docs": [
            "由 oracle 模块验证 discriminator + feed_id + staleness。"
          ]
        },
        {
          "name": "switchboardFeed",
          "docs": [
            "Switchboard PullFeed 账户（v1.1 fallback）。"
          ]
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "liquidityPoolProgram",
          "docs": [
            "用 `address = liquidity_pool::ID` 编译期常量校验（比 constraint = key()==... 省字节）。"
          ],
          "address": "2zRgfaNK4DCbbjHkd5pfaE9vwv9gnAP5DdeNDU8VWoTE"
        },
        {
          "name": "poolConfig",
          "writable": true
        },
        {
          "name": "candidateLpAccount",
          "writable": true
        },
        {
          "name": "makerDeal",
          "writable": true
        },
        {
          "name": "lpPosition",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "triggerLimitOpenArgs"
            }
          }
        }
      ]
    },
    {
      "name": "triggerStopTakeClose",
      "docs": [
        "keeper 触发 STOP_TAKE_CLOSE（TP / SL 价格命中时）。"
      ],
      "discriminator": [
        142,
        215,
        179,
        5,
        215,
        30,
        151,
        90
      ],
      "accounts": [
        {
          "name": "keeper",
          "writable": true,
          "signer": true
        },
        {
          "name": "taker",
          "writable": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "keeperRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  101,
                  101,
                  112,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "dealRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.deal_seq"
              }
            ]
          }
        },
        {
          "name": "priceUpdate",
          "docs": [
            "oracle 模块用 LimitedOrder 创建时快照的 pyth_feed_id 校验内容。"
          ]
        },
        {
          "name": "limitedOrder",
          "docs": [
            "要触发的 LimitedOrder —— close 退租给 taker。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "liquidityPoolProgram",
          "address": "2zRgfaNK4DCbbjHkd5pfaE9vwv9gnAP5DdeNDU8VWoTE"
        },
        {
          "name": "poolConfig",
          "writable": true
        },
        {
          "name": "makerDeal",
          "writable": true
        },
        {
          "name": "lpAccount",
          "writable": true
        },
        {
          "name": "lpPosition",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "triggerStopTakeCloseArgs"
            }
          }
        }
      ]
    },
    {
      "name": "triggerStopTakeOpen",
      "docs": [
        "keeper 触发 STOP_TAKE_OPEN（条件开仓，价格命中 target 时触发 Market 开仓）。",
        "v1 仅支持 Market 路径（cond.open_limit_price / gain_trigger / loss_trigger 必须全 0）；",
        "带 LIMIT_OPEN 子单 + 自动 TP/SL 的完整链路留 v1.1。"
      ],
      "discriminator": [
        42,
        5,
        58,
        197,
        212,
        219,
        154,
        152
      ],
      "accounts": [
        {
          "name": "keeper",
          "docs": [
            "keeper 调用方 —— 必须在 KeeperRegistry 白名单内。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "taker",
          "writable": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "keeperRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  101,
                  101,
                  112,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "pairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "limited_order.pair_id",
                "account": "limitedOrder"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "taker"
              }
            ]
          }
        },
        {
          "name": "position",
          "docs": [
            "Position PDA —— 触发时 init_if_needed（首次该方向开仓）或累加。"
          ],
          "writable": true
        },
        {
          "name": "dealRecord",
          "docs": [
            "新 DealRecord（trigger 后创建）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.deal_seq"
              }
            ]
          }
        },
        {
          "name": "limitedOrder",
          "docs": [
            "要触发的 LimitedOrder —— close 退租给 taker。",
            "kind 必须是 STOP_TAKE_OPEN，否则用 `trigger_limit_open` / `trigger_stop_take_close`。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  109,
                  105,
                  116,
                  101,
                  100,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "triggerCondition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  105,
                  103,
                  103,
                  101,
                  114,
                  95,
                  99,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.order_seq"
              }
            ]
          }
        },
        {
          "name": "priceUpdate",
          "docs": [
            "由 oracle 模块验证 discriminator + feed_id + staleness + conf。"
          ]
        },
        {
          "name": "switchboardFeed",
          "docs": [
            "Switchboard PullFeed 账户（v1.1 fallback）。"
          ]
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "liquidityPoolProgram",
          "address": "2zRgfaNK4DCbbjHkd5pfaE9vwv9gnAP5DdeNDU8VWoTE"
        },
        {
          "name": "poolConfig",
          "writable": true
        },
        {
          "name": "candidateLpAccount",
          "writable": true
        },
        {
          "name": "makerDeal",
          "writable": true
        },
        {
          "name": "lpPosition",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "triggerStopTakeOpenArgs"
            }
          }
        }
      ]
    },
    {
      "name": "updatePair",
      "docs": [
        "admin 增量更新已存在的 PairConfig 字段（trading_fee_rate / leverage /",
        "status / Pyth 账户切换等）。**不允许改 pair_id / multi / lot_multi**",
        "（会破坏已有 Position 计算口径）。"
      ],
      "discriminator": [
        176,
        62,
        36,
        215,
        255,
        206,
        35,
        12
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "docs": [
            "只读 — 校验 admin。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "pairConfig",
          "docs": [
            "必须已存在（无 init）— pair_id 路由到对应 PDA。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  105,
                  114,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "args.pair_id"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updatePairArgs"
            }
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "docs": [
        "用户提现（SPL transfer 从 vault 到用户 ATA；先只校验 available，未来加 PnL 风险检查）。"
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleMint",
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "settleConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "vaultToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "dealRecord",
      "discriminator": [
        77,
        196,
        183,
        89,
        93,
        193,
        133,
        246
      ]
    },
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    },
    {
      "name": "keeperRegistry",
      "discriminator": [
        131,
        98,
        137,
        110,
        2,
        90,
        80,
        4
      ]
    },
    {
      "name": "limitedOrder",
      "discriminator": [
        21,
        1,
        31,
        223,
        58,
        181,
        89,
        252
      ]
    },
    {
      "name": "pairConfig",
      "discriminator": [
        119,
        167,
        13,
        129,
        136,
        228,
        151,
        77
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    },
    {
      "name": "seqCounter",
      "discriminator": [
        43,
        24,
        58,
        200,
        54,
        201,
        120,
        76
      ]
    },
    {
      "name": "settleConfig",
      "discriminator": [
        105,
        211,
        143,
        159,
        254,
        70,
        10,
        201
      ]
    },
    {
      "name": "triggerCondition",
      "discriminator": [
        147,
        75,
        223,
        38,
        147,
        8,
        232,
        225
      ]
    },
    {
      "name": "userAccount",
      "discriminator": [
        211,
        33,
        136,
        16,
        186,
        110,
        242,
        127
      ]
    },
    {
      "name": "userLeverage",
      "discriminator": [
        56,
        241,
        231,
        102,
        164,
        94,
        51,
        66
      ]
    }
  ],
  "events": [
    {
      "name": "accountPosition",
      "discriminator": [
        134,
        192,
        118,
        107,
        191,
        8,
        100,
        236
      ]
    },
    {
      "name": "allOraclesFailed",
      "discriminator": [
        118,
        47,
        148,
        249,
        108,
        110,
        137,
        152
      ]
    },
    {
      "name": "balanceOfTaker",
      "discriminator": [
        244,
        2,
        130,
        5,
        87,
        79,
        33,
        139
      ]
    },
    {
      "name": "createLimitedOrder",
      "discriminator": [
        196,
        122,
        227,
        125,
        71,
        252,
        215,
        99
      ]
    },
    {
      "name": "createTriggerCondition",
      "discriminator": [
        164,
        25,
        110,
        38,
        0,
        79,
        249,
        186
      ]
    },
    {
      "name": "deposited",
      "discriminator": [
        111,
        141,
        26,
        45,
        161,
        35,
        100,
        57
      ]
    },
    {
      "name": "errorInfo",
      "discriminator": [
        30,
        81,
        190,
        4,
        8,
        78,
        25,
        118
      ]
    },
    {
      "name": "globalConfigInitialized",
      "discriminator": [
        5,
        221,
        172,
        158,
        77,
        87,
        157,
        113
      ]
    },
    {
      "name": "globalConfigUpdated",
      "discriminator": [
        232,
        238,
        158,
        123,
        210,
        172,
        159,
        46
      ]
    },
    {
      "name": "keeperRegistryInitialized",
      "discriminator": [
        248,
        82,
        234,
        142,
        95,
        170,
        198,
        187
      ]
    },
    {
      "name": "keeperToggled",
      "discriminator": [
        140,
        140,
        151,
        214,
        192,
        171,
        16,
        85
      ]
    },
    {
      "name": "limitedOrderHistory",
      "discriminator": [
        175,
        63,
        230,
        0,
        24,
        14,
        217,
        5
      ]
    },
    {
      "name": "oracleSourceUsed",
      "discriminator": [
        111,
        120,
        142,
        85,
        111,
        57,
        53,
        87
      ]
    },
    {
      "name": "orderHistory",
      "discriminator": [
        106,
        83,
        63,
        115,
        3,
        245,
        195,
        137
      ]
    },
    {
      "name": "pairRegistered",
      "discriminator": [
        125,
        143,
        112,
        66,
        5,
        53,
        110,
        4
      ]
    },
    {
      "name": "pairUpdated",
      "discriminator": [
        208,
        67,
        143,
        117,
        86,
        212,
        167,
        194
      ]
    },
    {
      "name": "settleConfigInitialized",
      "discriminator": [
        82,
        254,
        121,
        112,
        239,
        226,
        124,
        85
      ]
    },
    {
      "name": "settleVaultInitialized",
      "discriminator": [
        168,
        104,
        73,
        247,
        29,
        245,
        204,
        230
      ]
    },
    {
      "name": "tradeHistory",
      "discriminator": [
        121,
        42,
        29,
        240,
        96,
        211,
        51,
        38
      ]
    },
    {
      "name": "transactionHistory",
      "discriminator": [
        148,
        208,
        116,
        106,
        66,
        38,
        192,
        246
      ]
    },
    {
      "name": "userAccountInitialized",
      "discriminator": [
        248,
        93,
        107,
        233,
        72,
        9,
        130,
        57
      ]
    },
    {
      "name": "withdrawn",
      "discriminator": [
        20,
        89,
        223,
        198,
        194,
        124,
        219,
        13
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notAdmin",
      "msg": "Caller is not the admin"
    },
    {
      "code": 6001,
      "name": "notKeeper",
      "msg": "Caller is not a registered keeper"
    },
    {
      "code": 6002,
      "name": "notPerpCore",
      "msg": "Caller is not the perp_core program (CPI guard)"
    },
    {
      "code": 6003,
      "name": "invalidMaintenanceMarginRate",
      "msg": "Invalid maintenance margin rate"
    },
    {
      "code": 6004,
      "name": "invalidPercent",
      "msg": "Invalid percent (must be <= 1e18)"
    },
    {
      "code": 6005,
      "name": "invalidLeverage",
      "msg": "Invalid leverage (must be > 0)"
    },
    {
      "code": 6006,
      "name": "invalidFeeRate",
      "msg": "Invalid trading fee rate"
    },
    {
      "code": 6007,
      "name": "invalidPairStatus",
      "msg": "Invalid pair status"
    },
    {
      "code": 6008,
      "name": "pairNameTooLong",
      "msg": "Pair name too long"
    },
    {
      "code": 6009,
      "name": "settleMintZero",
      "msg": "Settle mint cannot be zero address"
    },
    {
      "code": 6010,
      "name": "pythFeedIdZero",
      "msg": "Pyth feed id cannot be all-zero"
    },
    {
      "code": 6011,
      "name": "invalidStaleness",
      "msg": "Max staleness must be > 0"
    },
    {
      "code": 6012,
      "name": "keeperRegistryFull",
      "msg": "Keeper registry is full"
    },
    {
      "code": 6013,
      "name": "keeperNotFound",
      "msg": "Keeper not found"
    },
    {
      "code": 6014,
      "name": "keeperAlreadyRegistered",
      "msg": "Keeper already registered"
    },
    {
      "code": 6015,
      "name": "versionMismatch",
      "msg": "Account version mismatch — please run migration"
    },
    {
      "code": 6016,
      "name": "depositTooSmall",
      "msg": "Deposit amount is below the minimum"
    },
    {
      "code": 6017,
      "name": "amountZero",
      "msg": "Amount must be > 0"
    },
    {
      "code": 6018,
      "name": "insufficientAvailable",
      "msg": "Insufficient available balance"
    },
    {
      "code": 6019,
      "name": "settleMintMismatch",
      "msg": "User account belongs to a different settle mint"
    },
    {
      "code": 6020,
      "name": "userOwnerMismatch",
      "msg": "User account does not belong to the signer"
    },
    {
      "code": 6021,
      "name": "settleConfigPaused",
      "msg": "Settle config is paused; deposit/trade disabled"
    },
    {
      "code": 6022,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6023,
      "name": "pythFeedIdMismatch",
      "msg": "Pyth price account feed_id does not match registered pair feed_id"
    },
    {
      "code": 6024,
      "name": "pythPriceTooStale",
      "msg": "Pyth price is stale (exceeds max_staleness_secs)"
    },
    {
      "code": 6025,
      "name": "pythPriceInvalid",
      "msg": "Pyth price is <= 0"
    },
    {
      "code": 6026,
      "name": "pythConfTooWide",
      "msg": "Pyth confidence interval too wide"
    },
    {
      "code": 6027,
      "name": "pythDiscriminatorMismatch",
      "msg": "Pyth price account discriminator mismatch"
    },
    {
      "code": 6028,
      "name": "pythAccountTooShort",
      "msg": "Pyth price account data too short"
    },
    {
      "code": 6029,
      "name": "pythExponentOutOfRange",
      "msg": "Pyth price exponent out of supported range"
    },
    {
      "code": 6030,
      "name": "invalidDirection",
      "msg": "Position direction must be 0 (LONG) or 1 (SHORT)"
    },
    {
      "code": 6031,
      "name": "positionEmpty",
      "msg": "Position is empty; cannot close or modify"
    },
    {
      "code": 6032,
      "name": "positionDealsFull",
      "msg": "Position deal list is full"
    },
    {
      "code": 6033,
      "name": "insufficientPositionSize",
      "msg": "Insufficient available position size (after freeze)"
    },
    {
      "code": 6034,
      "name": "leverageTooLow",
      "msg": "Leverage must be >= 1x (1e18)"
    },
    {
      "code": 6035,
      "name": "leverageTooHigh",
      "msg": "Leverage exceeds pair maximum"
    },
    {
      "code": 6036,
      "name": "deadlineExpired",
      "msg": "Transaction deadline has expired"
    },
    {
      "code": 6037,
      "name": "orderAmountBelowMin",
      "msg": "Order amount is below the pair minimum"
    },
    {
      "code": 6038,
      "name": "orderTypeNotSupported",
      "msg": "Order type not supported (D5 only Market open)"
    },
    {
      "code": 6039,
      "name": "pairNotTradable",
      "msg": "Pair is paused or offline; trading disabled"
    },
    {
      "code": 6040,
      "name": "dealSeqMismatch",
      "msg": "DealRecord seq does not match SeqCounter.next_deal_seq"
    },
    {
      "code": 6041,
      "name": "directionMismatch",
      "msg": "Position direction does not match the args.direction"
    },
    {
      "code": 6042,
      "name": "userLeverageMismatch",
      "msg": "UserLeverage account belongs to a different (settle_mint, pair_id, owner)"
    },
    {
      "code": 6043,
      "name": "pairConfigMismatch",
      "msg": "Pair config does not match the requested pair_id"
    },
    {
      "code": 6044,
      "name": "liquidityInsufficient",
      "msg": "Liquidity is not enough to fill the order"
    },
    {
      "code": 6045,
      "name": "positionDealListFull",
      "msg": "Position deal list is at capacity; cannot append more deals"
    },
    {
      "code": 6046,
      "name": "orderNotPending",
      "msg": "LimitedOrder is not in a state that allows this action"
    },
    {
      "code": 6047,
      "name": "orderAlreadyTerminated",
      "msg": "LimitedOrder has already been terminated (cancelled/completed/expired/liquidated)"
    },
    {
      "code": 6048,
      "name": "orderNotOwned",
      "msg": "LimitedOrder does not belong to the caller"
    },
    {
      "code": 6049,
      "name": "orderSeqMismatch",
      "msg": "LimitedOrder seq does not match SeqCounter.next_order_seq"
    },
    {
      "code": 6050,
      "name": "orderKindMismatch",
      "msg": "LimitedOrder kind / offset mismatch for this entry point"
    },
    {
      "code": 6051,
      "name": "openTriggerPriceZero",
      "msg": "Stop-take OPEN requires trigger_price > 0"
    },
    {
      "code": 6052,
      "name": "closeTriggersAllZero",
      "msg": "Stop-take CLOSE requires gain_trigger > 0 OR loss_trigger > 0"
    },
    {
      "code": 6053,
      "name": "orderNotExpired",
      "msg": "Order has not yet expired (now <= good_till)"
    },
    {
      "code": 6054,
      "name": "triggerPriceNotReached",
      "msg": "Trigger price condition not reached"
    },
    {
      "code": 6055,
      "name": "rewardGasInsufficient",
      "msg": "reward_gas exceeds user available balance"
    },
    {
      "code": 6056,
      "name": "triggerConditionMismatch",
      "msg": "Trigger condition account is not paired with this LimitedOrder"
    },
    {
      "code": 6057,
      "name": "notOrderOwner",
      "msg": "Caller is not the order owner (cancel) — use expire path instead"
    },
    {
      "code": 6058,
      "name": "unsupportedConditionalChain",
      "msg": "STOP_TAKE_OPEN with conditional chain (limit sub-order / auto TP/SL) not supported in v1"
    },
    {
      "code": 6059,
      "name": "switchboardAccountTooShort",
      "msg": "Switchboard feed account data too short"
    },
    {
      "code": 6060,
      "name": "switchboardDiscriminatorMismatch",
      "msg": "Switchboard feed account discriminator mismatch"
    },
    {
      "code": 6061,
      "name": "switchboardFeedHashMismatch",
      "msg": "Switchboard feed_hash does not match registered hash"
    },
    {
      "code": 6062,
      "name": "switchboardPriceInvalid",
      "msg": "Switchboard price is <= 0"
    },
    {
      "code": 6063,
      "name": "switchboardPriceTooStale",
      "msg": "Switchboard price is stale (exceeds max_staleness_secs)"
    },
    {
      "code": 6064,
      "name": "switchboardAccountMismatch",
      "msg": "Switchboard feed account does not match registered account"
    },
    {
      "code": 6065,
      "name": "allOraclesUnavailable",
      "msg": "All configured oracles unavailable (Pyth + Switchboard both failed)"
    },
    {
      "code": 6066,
      "name": "invalidOracleMode",
      "msg": "Oracle mode value invalid"
    },
    {
      "code": 6067,
      "name": "invalidOracleSource",
      "msg": "Oracle source value invalid"
    },
    {
      "code": 6068,
      "name": "oracleSourceUnsupported",
      "msg": "Selected oracle source is not yet supported on Solana (e.g. Supra)"
    },
    {
      "code": 6069,
      "name": "chainlinkFeedIdZero",
      "msg": "Chainlink feed id is zero"
    },
    {
      "code": 6070,
      "name": "chainlinkVerifierMismatch",
      "msg": "Chainlink verifier program account mismatch"
    },
    {
      "code": 6071,
      "name": "chainlinkNoReturnData",
      "msg": "Chainlink verify returned no data"
    },
    {
      "code": 6072,
      "name": "chainlinkReportTooShort",
      "msg": "Chainlink report too short"
    },
    {
      "code": 6073,
      "name": "chainlinkFeedIdMismatch",
      "msg": "Chainlink report feed id mismatch"
    },
    {
      "code": 6074,
      "name": "chainlinkPriceOverflow",
      "msg": "Chainlink benchmark price overflow / negative"
    },
    {
      "code": 6075,
      "name": "chainlinkPriceInvalid",
      "msg": "Chainlink benchmark price invalid (zero)"
    },
    {
      "code": 6076,
      "name": "chainlinkPriceStale",
      "msg": "Chainlink report is stale"
    },
    {
      "code": 6077,
      "name": "chainlinkAccountsMissing",
      "msg": "Chainlink oracle accounts missing in remaining_accounts (need 4)"
    },
    {
      "code": 6078,
      "name": "marketOrderDisabled",
      "msg": "Market orders are disabled for this pair (global switch / per-pair override)"
    },
    {
      "code": 6079,
      "name": "limitOrderDisabled",
      "msg": "Limit orders are disabled for this pair (global switch / per-pair override)"
    },
    {
      "code": 6080,
      "name": "stopTakeOrderDisabled",
      "msg": "Stop-take (TP/SL) orders are disabled (global switch / per-pair override)"
    },
    {
      "code": 6081,
      "name": "invalidOrderSwitch",
      "msg": "Order switch value invalid (must be <= 0b11)"
    },
    {
      "code": 6082,
      "name": "invalidTriggerDealSeq",
      "msg": "Trigger-created deal_seq must be >= TRIGGER_DEAL_SEQ_BASE (high range)"
    },
    {
      "code": 6083,
      "name": "goodTillMustBeFuture",
      "msg": "good_till must be in the future (good_till > now)"
    },
    {
      "code": 6084,
      "name": "withdrawBlockedByUnrealizedLoss",
      "msg": "Withdraw blocked: available must cover amount + unrealized loss"
    },
    {
      "code": 6085,
      "name": "withdrawPnlAccountsMismatch",
      "msg": "Withdraw PnL remaining_accounts must be groups of 3 [position, pair_config, price_update]"
    },
    {
      "code": 6086,
      "name": "withdrawPnlAccountsUnordered",
      "msg": "Withdraw PnL positions must be passed in strictly increasing (pair_id, direction) order"
    },
    {
      "code": 6087,
      "name": "withdrawPnlAccountInvalid",
      "msg": "Withdraw PnL remaining account is not a valid program-owned account"
    }
  ],
  "types": [
    {
      "name": "accountPosition",
      "docs": [
        "Position 字段变化时的快照（开 / 平 / 清算 后）。",
        "",
        "EVM 对应：`ICommon.AccountPosition`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "pairName",
            "docs": [
              "交易对名称（对齐 EVM `AccountPosition.name`）；trigger 等无 pair_config 上下文的发出点为空串 `\"\"`。"
            ],
            "type": "string"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "value",
            "type": "u128"
          },
          {
            "name": "size",
            "type": "u128"
          },
          {
            "name": "margin",
            "type": "u64"
          },
          {
            "name": "freeze",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "allOraclesFailed",
      "docs": [
        "双源同时挂时合约触发的告警事件（admin 应立即介入熔断 pair）。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "balanceOfTaker",
      "docs": [
        "任一改动 UserAccount 的 ix 前后各发一次（stage=0 与 stage=10）。",
        "",
        "EVM 对应：`IPerpetual.BalanceOfTaker`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taker",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "availableAmount",
            "type": "u64"
          },
          {
            "name": "marginAmount",
            "type": "u64"
          },
          {
            "name": "orderLocked",
            "type": "u64"
          },
          {
            "name": "stage",
            "docs": [
              "0 = 进入 ix 前；10 = 离开 ix 前；其它值供 keeper / liquidate 用。"
            ],
            "type": "u8"
          },
          {
            "name": "diff",
            "docs": [
              "|deposit - (available + margin + order_locked)|；理论应为 0。"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "cancelLimitOrderArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderSeq",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "closePositionArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "dealSeq",
            "docs": [
              "要关的 DealRecord 的 deal_id（=perp_core 端 SeqCounter 分配的 seq）。"
            ],
            "type": "u64"
          },
          {
            "name": "closeAmountE18",
            "docs": [
              "关闭数量（1e18）；0 = full close（关 deal.remaining）。"
            ],
            "type": "u128"
          },
          {
            "name": "orderType",
            "docs": [
              "0 = Market（D7 唯一支持）；1 = Limit（D8）。"
            ],
            "type": "u8"
          },
          {
            "name": "deadline",
            "docs": [
              "0 = 无截止；> 0 = unix sec。"
            ],
            "type": "i64"
          },
          {
            "name": "chainlinkReport",
            "docs": [
              "deal.oracle_source=Chainlink(3) 时的签名 Data Streams report bytes；其余源传空 vec。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "collectTradeFeeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dealSeq",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "createLimitedOrder",
      "docs": [
        "限价单 / 条件单创建。",
        "",
        "EVM 对应：`IPerpetual.CreateLimitedOrder`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taker",
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "pairName",
            "docs": [
              "交易对名称（对齐 EVM `CreateLimitedOrder.name`），取自 `PairConfig.name`。"
            ],
            "type": "string"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "offset",
            "type": "u8"
          },
          {
            "name": "orderKind",
            "type": "u8"
          },
          {
            "name": "state",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u128"
          },
          {
            "name": "targetPrice",
            "type": "u64"
          },
          {
            "name": "margin",
            "type": "u64"
          },
          {
            "name": "tradingFee",
            "type": "u64"
          },
          {
            "name": "rewardGas",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "goodTill",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "createTriggerCondition",
      "docs": [
        "TriggerCondition 创建（伴随 stop_take_order）。",
        "",
        "EVM 对应：`IPerpetual.CreateTriggerCondition`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "mean",
            "type": "u8"
          },
          {
            "name": "openLimitPrice",
            "type": "u64"
          },
          {
            "name": "gainTriggerPrice",
            "type": "u64"
          },
          {
            "name": "gainLimitPrice",
            "type": "u64"
          },
          {
            "name": "lossTriggerPrice",
            "type": "u64"
          },
          {
            "name": "lossLimitPrice",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "dealRecord",
      "docs": [
        "一笔已成交订单；deal_id 由 SeqCounter 全局递增。",
        "PDA seeds: [\"deal_record\", settle_mint, deal_id_le_bytes]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "dealId",
            "docs": [
              "全局递增的成交 ID（由 SeqCounter 分配）。"
            ],
            "type": "u64"
          },
          {
            "name": "taker",
            "docs": [
              "交易发起方（taker）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "docs": [
              "结算币 mint。"
            ],
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "docs": [
              "交易对 ID。"
            ],
            "type": "u16"
          },
          {
            "name": "direction",
            "docs": [
              "方向0 = LONG, 1 = SHORT。"
            ],
            "type": "u8"
          },
          {
            "name": "offset",
            "docs": [
              "开平0 = OPEN, 1 = CLOSE。"
            ],
            "type": "u8"
          },
          {
            "name": "amount",
            "docs": [
              "成交数量（合约张数，1e9 精度；保留 u128）。"
            ],
            "type": "u128"
          },
          {
            "name": "price",
            "docs": [
              "成交价格（1e9 精度）。"
            ],
            "type": "u64"
          },
          {
            "name": "margin",
            "docs": [
              "占用保证金（结算币最小单位）。"
            ],
            "type": "u64"
          },
          {
            "name": "tradingFee",
            "docs": [
              "已扣手续费（结算币最小单位）。"
            ],
            "type": "u64"
          },
          {
            "name": "remaining",
            "docs": [
              "当前剩余数量（部分平仓后递减；为 0 时表示已完全平仓；保留 u128）。"
            ],
            "type": "u128"
          },
          {
            "name": "state",
            "docs": [
              "DealState:",
              "0 = Active（活跃中）",
              "1 = Partial（部分平仓）",
              "2 = Closed（全部平仓）",
              "3 = Liquidated（被清算）",
              "4 = Agreement（协议平仓）"
            ],
            "type": "u8"
          },
          {
            "name": "matchedPool",
            "docs": [
              "匹配的 LP/Pool 账户地址（用于平仓时回调）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "poolType",
            "docs": [
              "pool 类型1 = 公共池, 2 = 私有 LP。"
            ],
            "type": "u8"
          },
          {
            "name": "openedAt",
            "docs": [
              "成交时间戳（unix sec）。"
            ],
            "type": "i64"
          },
          {
            "name": "closedAt",
            "docs": [
              "关闭时间戳（unix sec；0 表示未关闭）。"
            ],
            "type": "i64"
          },
          {
            "name": "feeCollected",
            "docs": [
              "手续费是否已被 `collect_trade_fee` ix 切走（防双重 split）。",
              "默认 false；split_trade_fee 成功 CPI 后置为 true。"
            ],
            "type": "bool"
          },
          {
            "name": "oracleSource",
            "docs": [
              "开仓时生效的预言机源（0=Pyth 1=Switchboard 2=Supra 3=Chainlink）。",
              "仅作审计/索引记录 —— 平仓/清算按 pair **当前** 配置的源结算，不绑定本字段。"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留（借 1 字节给 oracle_source）。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "deposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "depositTotal",
            "type": "u64"
          },
          {
            "name": "availableAfter",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "errorInfo",
      "docs": [
        "trigger / expire 时遇到非致命错误（不 revert 整笔 tx）。",
        "",
        "EVM 对应：`IPerpetual.ErrorInfo`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "code",
            "type": "u32"
          },
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "message",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "expireOrderArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderSeq",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "globalConfig",
      "docs": [
        "perp_core 全局 singleton 配置。PDA seeds: [\"global_config\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "admin",
            "docs": [
              "管理员（可修改本配置 + 调用所有 admin ix）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "riskFundAuthority",
            "docs": [
              "风险基金 vault authority（PDA），覆盖穿仓损失。"
            ],
            "type": "pubkey"
          },
          {
            "name": "platformFeeAuthority",
            "docs": [
              "平台交易费收款 authority。"
            ],
            "type": "pubkey"
          },
          {
            "name": "tradeFeeAuthority",
            "docs": [
              "普通交易费收款 authority（可累计后批量结算给做市方）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "liquidityPoolProgram",
            "docs": [
              "liquidity_pool program ID（CPI 校验）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "treasuryProgram",
            "docs": [
              "treasury program ID（CPI 校验）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "maintenanceMarginRate",
            "docs": [
              "维持保证金率，1e9 精度（默认 1e8 = 10%）。"
            ],
            "type": "u64"
          },
          {
            "name": "minDepositAmount",
            "docs": [
              "最小入金金额，1e9 精度（默认 1e6）。"
            ],
            "type": "u64"
          },
          {
            "name": "toPlatformTradeFeePct",
            "docs": [
              "划入平台账户的手续费比例，1e9 精度（默认 0.2 * 1e9 = 20%）。"
            ],
            "type": "u64"
          },
          {
            "name": "mergeRemainingFeeToBuyback",
            "docs": [
              "true: 剩余手续费并入 buyback；false: 进入 trade_fee_authority。"
            ],
            "type": "bool"
          },
          {
            "name": "orderSwitch",
            "docs": [
              "下单类型「全局总闸」bitmask（bit0=市价, bit1=限价, bit2=止盈止损/条件单；1=允许）。",
              "默认 `ORDER_SWITCH_ALL` (0b111) = 三类都开。各 pair 可用 `PairConfig.order_override_*` 覆盖。"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留 padding（从 64 借 1 字节给 order_switch）。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "globalConfigInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "liquidityPoolProgram",
            "type": "pubkey"
          },
          {
            "name": "treasuryProgram",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "globalConfigUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "field",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "initGlobalConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "初始 admin（控制所有后续 admin ix）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "riskFundAuthority",
            "docs": [
              "风险基金 vault 的授权地址（独立 PDA authority）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "platformFeeAuthority",
            "docs": [
              "平台手续费 vault 授权地址。"
            ],
            "type": "pubkey"
          },
          {
            "name": "tradeFeeAuthority",
            "docs": [
              "交易费 vault 授权地址（≠ platform）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "liquidityPoolProgram",
            "docs": [
              "liquidity_pool program ID（用于 CPI `seeds::program` 校验）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "treasuryProgram",
            "docs": [
              "treasury program ID（同上）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "maintenanceMarginRate",
            "docs": [
              "维持保证金率（1e9 精度）；None → 用 GlobalConfig::DEFAULT_MAINTENANCE_MARGIN_RATE。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "minDepositAmount",
            "docs": [
              "最小入金额（base units）；None → 用默认。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "toPlatformTradeFeePct",
            "docs": [
              "平台抽成比例（1e9 精度）；None → 用默认。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "mergeRemainingFeeToBuyback",
            "docs": [
              "是否启用回购模块（v2 用；v1 直接传 false）。"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "initSettleConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maintenanceMarginRate",
            "docs": [
              "维持保证金率（1e9 精度）；0 = fallback 到 GlobalConfig。"
            ],
            "type": "u64"
          },
          {
            "name": "minDepositAmount",
            "docs": [
              "最小入金额（base units）；0 = fallback 到 GlobalConfig。"
            ],
            "type": "u64"
          },
          {
            "name": "defaultLeverage",
            "docs": [
              "默认杠杆（1e9 精度，> 0）。"
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "docs": [
              "0=正常 1=暂停 2=下线。"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "keeperRegistry",
      "docs": [
        "Keeper 白名单（trigger / liquidate / expire 调用方）。",
        "PDA seeds: [\"keeper_registry\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "admin",
            "docs": [
              "谁能修改 keeper 列表（必须等于 GlobalConfig.admin）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "keepers",
            "docs": [
              "当前激活的 keeper pubkeys（最多 32 个；够覆盖多区域多冗余实例）。"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "keeperRegistryInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "keeperToggled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "keeper",
            "type": "pubkey"
          },
          {
            "name": "enabled",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "limitedOrder",
      "docs": [
        "一笔挂单（LimitOpen / LimitClose / StopTake）；order_seq 由 SeqCounter 分配。",
        "PDA seeds: [\"limited_order\", settle_mint, order_seq_le_bytes]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "orderSeq",
            "docs": [
              "全局递增序号（由 SeqCounter.alloc_order_seq() 分配）。"
            ],
            "type": "u64"
          },
          {
            "name": "taker",
            "docs": [
              "挂单所有者。"
            ],
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "docs": [
              "结算币 mint。"
            ],
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "docs": [
              "交易对。"
            ],
            "type": "u16"
          },
          {
            "name": "direction",
            "docs": [
              "0=LONG, 1=SHORT。"
            ],
            "type": "u8"
          },
          {
            "name": "offset",
            "docs": [
              "0=OPEN, 1=CLOSE（与 DealRecord 一致）。"
            ],
            "type": "u8"
          },
          {
            "name": "orderKind",
            "docs": [
              "订单种类：",
              "- 1 = LimitOpen      —— 普通限价开仓（创建时冻结 margin+fee）",
              "- 2 = LimitClose     —— 普通限价平仓（创建时冻结 Position.freeze）",
              "- 3 = StopTakeOpen   —— 条件开仓（不冻结资金，只冻结 reward_gas）",
              "- 4 = StopTakeClose  —— 止盈止损（不冻结资金 / 不冻结仓位，只冻结 reward_gas）"
            ],
            "type": "u8"
          },
          {
            "name": "state",
            "docs": [
              "订单状态：",
              "- 1 = PENDING     —— 等待 trigger",
              "- 2 = PARTIAL     —— 部分成交（D8 暂未实现，留给 v2）",
              "- 3 = COMPLETED   —— 已成交并被 keeper 标记完成",
              "- 4 = CANCELLED   —— 用户主动取消",
              "- 5 = LIQUIDATED  —— 清算时连带取消（D9 引入）",
              "- 6 = EXPIRED     —— 过期被 keeper 清理",
              "- 7 = EXCEPTION   —— trigger 时遇错（EVM emitErrorInfo 路径）"
            ],
            "type": "u8"
          },
          {
            "name": "amount",
            "docs": [
              "合约数量（1e9 精度；保留 u128）。"
            ],
            "type": "u128"
          },
          {
            "name": "targetPrice",
            "docs": [
              "目标价（1e9 精度 USD）。",
              "- LimitOpen / LimitClose：限价",
              "- StopTakeOpen：开仓 trigger 价",
              "- StopTakeClose：填 TP trigger 或 0（TP/SL 的全部 4 个参数在 TriggerCondition 里）"
            ],
            "type": "u64"
          },
          {
            "name": "margin",
            "docs": [
              "预先算好的开仓所需 margin（base units）。"
            ],
            "type": "u64"
          },
          {
            "name": "tradingFee",
            "docs": [
              "预先算好的开仓所需 trading_fee（base units）。"
            ],
            "type": "u64"
          },
          {
            "name": "rewardGas",
            "docs": [
              "用户预付的 keeper 触发报酬，**原生 SOL（lamports）**，托管在本订单 PDA 的 lamports 里",
              "（对齐 EVM 的 `msg.value` ETH 报酬）。触发时划给 keeper；撤单 / 过期随 PDA 关闭退回。"
            ],
            "type": "u64"
          },
          {
            "name": "startTime",
            "docs": [
              "创建时间（unix sec）。"
            ],
            "type": "i64"
          },
          {
            "name": "goodTill",
            "docs": [
              "截止时间（unix sec）。超过 keeper 调 expire_orders 清理。"
            ],
            "type": "i64"
          },
          {
            "name": "pythFeedId",
            "docs": [
              "创建时快照的 Pyth feed_id —— trigger 时 oracle::read_price 校验用户传入的",
              "PriceUpdateV2 账户里的 feed_id 与此一致（防 keeper 传错 feed 攻击）。"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "snapTradingFeeRate",
            "docs": [
              "创建时快照的 trading_fee_rate（1e9 精度）—— 用户挂单时的费率，trigger 时不再读 pair_config。"
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "limitedOrderHistory",
      "docs": [
        "限价单 / 条件单状态变化（成交 / 取消 / 过期）。",
        "",
        "EVM 对应：`IPerpetual.LimitedOrderHistory`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taker",
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "pairName",
            "docs": [
              "交易对名称（对齐 EVM `LimitedOrderHistory.name`）；trigger/expire/cancel 无 pair_config 上下文为空串 `\"\"`。"
            ],
            "type": "string"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "offset",
            "type": "u8"
          },
          {
            "name": "orderKind",
            "type": "u8"
          },
          {
            "name": "state",
            "docs": [
              "新状态：LimitedOrder::STATE_*。"
            ],
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u128"
          },
          {
            "name": "targetPrice",
            "type": "u64"
          },
          {
            "name": "margin",
            "type": "u64"
          },
          {
            "name": "tradingFee",
            "type": "u64"
          },
          {
            "name": "rewardGas",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "liquidateTakerArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "dealSeq",
            "docs": [
              "要平的 DealRecord deal_id。"
            ],
            "type": "u64"
          },
          {
            "name": "chainlinkReport",
            "docs": [
              "deal.oracle_source=Chainlink(3) 时的签名 Data Streams report bytes；其余源传空 vec。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "lpAccount",
      "docs": [
        "LP（做市方）账户。私有 holder=用户；公共 holder=escrow_authority（聚合公共池资金）。",
        "PDA seeds: [\"lp_account\", settle_mint, holder]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "holder",
            "docs": [
              "持有者钱包（私有 LP 是用户，公共池 escrow 是 PoolConfig.escrow_authority）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "docs": [
              "结算币 SPL mint。"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "已 provide 的本金（累计入金，**不随**普通 withdraw 减少；做市盈亏会调）。"
            ],
            "type": "u64"
          },
          {
            "name": "availableAmount",
            "docs": [
              "可用余额（可继续接单 / 可 withdraw）。"
            ],
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "docs": [
              "已锁定保证金（MakerDeal 锁仓总额，含 margin + maintenance）。"
            ],
            "type": "u64"
          },
          {
            "name": "maintenanceMargin",
            "docs": [
              "维持保证金合计（locked_amount 中专门用于强平触发的部分）。"
            ],
            "type": "u64"
          },
          {
            "name": "leverage",
            "docs": [
              "杠杆倍数（1e18 精度，例 10x = 10e18）；EVM 默认 10。"
            ],
            "type": "u64"
          },
          {
            "name": "maintenanceMarginRate",
            "docs": [
              "维持保证金率（1e18 精度，例 10% = 1e17）；EVM 默认 0.2%（EVM 代码注释和值不一致，按值 10%）。"
            ],
            "type": "u64"
          },
          {
            "name": "addMarginRate",
            "docs": [
              "强平时追加保证金的比例（1e18 精度，例 10% = 1e17）。"
            ],
            "type": "u64"
          },
          {
            "name": "autoAddMargin",
            "docs": [
              "自动追加保证金开关。"
            ],
            "type": "bool"
          },
          {
            "name": "rejectOrder",
            "docs": [
              "拒绝接新单（暂停 maker 服务但保留已有头寸）。"
            ],
            "type": "bool"
          },
          {
            "name": "lastTime",
            "docs": [
              "最后操作时间戳。"
            ],
            "type": "i64"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "lpPosition",
      "docs": [
        "公共池 escrow 在某 (pair, direction) 的累计净仓位（公共路径才写）。",
        "PDA seeds: [\"lp_position\", settle_mint, pair_id_le_bytes, direction]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "direction",
            "docs": [
              "1 = LONG, 2 = SHORT（对齐 EVM `Direct`，0 为无效）；从 perp_core 透传。"
            ],
            "type": "u8"
          },
          {
            "name": "value",
            "docs": [
              "持仓 USD 总价值（1e18 精度，等同于 perp_core::Position.value）。"
            ],
            "type": "u128"
          },
          {
            "name": "size",
            "docs": [
              "持仓合约数量（1e18 精度）。"
            ],
            "type": "u128"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "makeLimitCloseArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "targetPrice",
            "docs": [
              "限价（1e9 USD），必须 > 0。"
            ],
            "type": "u64"
          },
          {
            "name": "amount",
            "docs": [
              "拟平仓数量（1e9 张），必须 ≤ position.size - position.freeze；保留 u128。"
            ],
            "type": "u128"
          },
          {
            "name": "rewardGas",
            "type": "u64"
          },
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "goodTill",
            "type": "i64"
          },
          {
            "name": "deadline",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "makeLimitOrderArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "targetPrice",
            "docs": [
              "限价（1e9 USD），必须 > 0。"
            ],
            "type": "u64"
          },
          {
            "name": "amount",
            "docs": [
              "合约数量（1e9 张；保留 u128）。"
            ],
            "type": "u128"
          },
          {
            "name": "rewardGas",
            "docs": [
              "keeper 触发报酬（base units, settle_mint）。"
            ],
            "type": "u64"
          },
          {
            "name": "orderSeq",
            "docs": [
              "客户端预读的 `SeqCounter.next_order_seq`，链上校验。"
            ],
            "type": "u64"
          },
          {
            "name": "goodTill",
            "docs": [
              "截止时间（unix sec），必须 > now。"
            ],
            "type": "i64"
          },
          {
            "name": "deadline",
            "docs": [
              "tx 截止时间（0 = 无限制）。"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "makerDeal",
      "docs": [
        "LP 接的 taker 对手单（与 perp_core::DealRecord 1:1，通过 taker_deal_seq 关联）。",
        "PDA seeds: [\"maker_deal\", settle_mint, taker_deal_seq_le_bytes]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "takerDealSeq",
            "docs": [
              "对应 taker DealRecord.deal_id（perp_core 端的 deal_seq）。"
            ],
            "type": "u64"
          },
          {
            "name": "maker",
            "docs": [
              "做市方钱包（私有 LP 是 LP 用户；公共池路径是 PoolConfig.escrow_authority）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "docs": [
              "结算币 mint。"
            ],
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "docs": [
              "交易对。"
            ],
            "type": "u16"
          },
          {
            "name": "direction",
            "docs": [
              "taker 方向（1 = LONG, 2 = SHORT，对齐 EVM）；maker 方向相反。"
            ],
            "type": "u8"
          },
          {
            "name": "size",
            "docs": [
              "当前剩余合约数量（1e9 精度，部分平仓后递减）。保留 u128（极大供应币如 SHIB）。"
            ],
            "type": "u128"
          },
          {
            "name": "marginAmount",
            "docs": [
              "已锁定保证金（base units，含 EVM 端 marginAmount）。"
            ],
            "type": "u64"
          },
          {
            "name": "maintenanceMargin",
            "docs": [
              "维持保证金（base units，EVM 端 maintenanceMargin；强平触发线）。"
            ],
            "type": "u64"
          },
          {
            "name": "pubPriFlag",
            "docs": [
              "`pubPriFlag`：",
              "1 = 公共池路径（maker = escrow_authority）",
              "2 = 私有池路径（maker = 用户 LP）",
              "11 / 12 / 13 = 私有→公共池\"移仓\"中间状态（D7 高级特性）"
            ],
            "type": "u8"
          },
          {
            "name": "movePrice",
            "docs": [
              "移仓时的\"被替换价\"（1e9），用于事件溯源；普通路径写 0。"
            ],
            "type": "u64"
          },
          {
            "name": "openedAt",
            "docs": [
              "创建时间戳（unix sec）。"
            ],
            "type": "i64"
          },
          {
            "name": "locked",
            "docs": [
              "是否仍处于活跃（true = 占用 LpAccount.locked_amount；false = 已关单或被强平）。"
            ],
            "type": "bool"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "oracleSourceUsed",
      "docs": [
        "每笔交易实际用了哪个 oracle 源（链上审计 / 监控告警依赖）。",
        "",
        "`source`：0 = Pyth (主路), 1 = Switchboard (fallback 触发)。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "source",
            "type": "u8"
          },
          {
            "name": "priceE18",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "orderHistory",
      "docs": [
        "一笔订单（开 / 平 / 限价）的高层日志。",
        "",
        "EVM 对应：`IPerpetual.OrderHistory`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taker",
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "pairName",
            "docs": [
              "EVM 对应 `OrderHistory.name`：交易对名称（来自 `PairConfig.name`，如 \"BTC/USD\"）。",
              "缺 `pair_config` 上下文的发出点（trigger_limit_close / expire_order）填空串。"
            ],
            "type": "string"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "orderSeq",
            "docs": [
              "与 EVM 的 `orderID` 对应：D5 阶段直接复用 deal_seq（每笔成交即一个 order）。"
            ],
            "type": "u64"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u128"
          },
          {
            "name": "costPrice",
            "docs": [
              "平仓时记录开仓均价；开仓为 0。"
            ],
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "tradingFee",
            "type": "u64"
          },
          {
            "name": "leverage",
            "docs": [
              "开仓有效杠杆（1e9 精度，反推自 position_value/margin）；非开仓/取消路径填 0。对齐 EVM `OrderHistory.leverage`。"
            ],
            "type": "u64"
          },
          {
            "name": "marginAmount",
            "docs": [
              "本笔占用保证金（base units）。对齐 EVM `OrderHistory.marginAmount`。"
            ],
            "type": "u64"
          },
          {
            "name": "limitOrderSeq",
            "docs": [
              "来源 LimitedOrder seq（无来源 = u64::MAX）。"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pairConfig",
      "docs": [
        "交易对配置（如 BTC/USD），一个 pair_id 一份；oracle 账户在此注册。",
        "PDA seeds: [\"pair_config\", pair_id_le_bytes]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "name",
            "docs": [
              "显示名称（如 \"BTC/USD\"），仅日志/事件用。"
            ],
            "type": "string"
          },
          {
            "name": "multi",
            "docs": [
              "价格 multiplier（EVM Underlying.multi）。1e9 表示原价；某些非 USD 计价对会用。"
            ],
            "type": "u64"
          },
          {
            "name": "tradingFeeRate",
            "docs": [
              "交易手续费率，1e9 精度（默认 1e6 = 0.1%）。"
            ],
            "type": "u64"
          },
          {
            "name": "minOrderAmount",
            "docs": [
              "单笔最小下单数量，1e9 精度（默认 1e7 = 0.01；保留 u128，与 amount 同域）。"
            ],
            "type": "u128"
          },
          {
            "name": "defaultLeverage",
            "docs": [
              "该 pair 的默认杠杆（用户未单独设置时），1e9 精度。"
            ],
            "type": "u64"
          },
          {
            "name": "lotMulti",
            "docs": [
              "Lot multiplier，1e9 精度（默认 1e9；保留 u128，与 amount 同域）。"
            ],
            "type": "u128"
          },
          {
            "name": "status",
            "docs": [
              "0 = normal, 1 = paused, 2 = offline。"
            ],
            "type": "u8"
          },
          {
            "name": "rewardGas",
            "docs": [
              "Keeper 触发限价/条件单的 reward（lamports）。"
            ],
            "type": "u64"
          },
          {
            "name": "pythFeedId",
            "docs": [
              "Pyth feed ID（32 字节，全网唯一）— 防止账户被替换为其他 feed。",
              "**核心防护**：用户/keeper 自带 PriceUpdateV2 账户，合约通过 feed_id 校验该账户内容与本 pair 对应。"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "maxStalenessSecs",
            "docs": [
              "价格新鲜度上限（秒）。"
            ],
            "type": "u64"
          },
          {
            "name": "maxConfidenceBps",
            "docs": [
              "confidence interval 上限，基点（默认 100 = 1%）。"
            ],
            "type": "u16"
          },
          {
            "name": "switchboardFeedAccount",
            "docs": [
              "Switchboard PullFeed 账户 Pubkey；Pubkey::default() 表示未配置 fallback。"
            ],
            "type": "pubkey"
          },
          {
            "name": "switchboardFeedHash",
            "docs": [
              "Switchboard feed_hash（IPFS job hash）—— 防账户替换。"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "switchboardMaxStalenessSecs",
            "docs": [
              "Switchboard 价格新鲜度上限（秒）；0 = 复用 max_staleness_secs。"
            ],
            "type": "u64"
          },
          {
            "name": "oracleMode",
            "docs": [
              "Oracle 工作模式：",
              "0 = PythOnly（默认，旧逻辑）",
              "1 = AutoFallback（Pyth 失败自动切 Switchboard）"
            ],
            "type": "u8"
          },
          {
            "name": "oracleSource",
            "docs": [
              "当前生效的预言机源（admin 切换）：",
              "0 = Pyth, 1 = Switchboard, 2 = Supra(预留，Solana 暂不支持), 3 = Chainlink。",
              "交易/平仓时按此源取价；合约校验传入的预言机账户与本 pair 配置一致。"
            ],
            "type": "u8"
          },
          {
            "name": "chainlinkFeedId",
            "docs": [
              "Chainlink Data Streams feed ID（32 字节）—— 防账户/报告被替换为其它 feed。"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "orderOverrideMask",
            "docs": [
              "覆盖掩码 bitmask（bit0=市价, bit1=限价）。",
              "bit 置 1 = 该类用本 pair 的 `order_override_value` 覆盖全局；置 0 = 跟随全局。",
              "默认 0 = 完全跟随 GlobalConfig.order_switch。"
            ],
            "type": "u8"
          },
          {
            "name": "orderOverrideValue",
            "docs": [
              "覆盖值 bitmask（仅 `order_override_mask` 置位的 bit 生效）。1=允许 0=禁止。"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留（已借出：2 覆盖字节 + oracle_source(1) + chainlink_feed_id(32) = 35）。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "pairRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "pythFeedId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "tradingFeeRate",
            "type": "u64"
          },
          {
            "name": "defaultLeverage",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pairUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "status",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "poolConfig",
      "docs": [
        "每结算币流动性池配置。PDA seeds: [\"pool_config\", settle_mint]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "admin",
            "docs": [
              "管理员（修改本配置）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "docs": [
              "该池对应的结算币 SPL mint。"
            ],
            "type": "pubkey"
          },
          {
            "name": "vaultAuthorityBump",
            "docs": [
              "Pool vault authority PDA bump 缓存。"
            ],
            "type": "u8"
          },
          {
            "name": "poolType",
            "docs": [
              "池类型：1=PUBLIC, 2=PRIVATE, 3=MIXED, 4=REFUSE。"
            ],
            "type": "u8"
          },
          {
            "name": "escrowAuthority",
            "docs": [
              "公共池 escrow 管理员（仅 pool_type 涉及 PUBLIC 时使用）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "perpCoreProgram",
            "docs": [
              "允许通过 CPI 调用本 program 的 perp_core program ID（CPI guard）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "status",
            "docs": [
              "0 = active, 1 = paused（停止 provide / match_order），2 = offline。"
            ],
            "type": "u8"
          },
          {
            "name": "totalShares",
            "docs": [
              "公共池累计发行份额数（1e18 精度）。",
              "第一次 provide(public)：total_shares = amount；",
              "之后 share_net_value = escrow_amount * 1e18 / total_shares。"
            ],
            "type": "u64"
          },
          {
            "name": "totalLockedLiquidity",
            "docs": [
              "全部 MakerDeal 占用的保证金合计（base units）。",
              "等于 Σ (maker_deal.margin_amount + maker_deal.maintenance_margin)。",
              "仅供链下监控；链上业务以 LpAccount.locked_amount 为准。"
            ],
            "type": "u64"
          },
          {
            "name": "privateMinProvideAmount",
            "docs": [
              "私有池单笔最小入金（base units）；0 = 走默认 1 USDC。",
              "EVM 对应：`privateMinMintAmount`（EVM 初值 1e18）。"
            ],
            "type": "u64"
          },
          {
            "name": "publicMinProvideAmount",
            "docs": [
              "公共池单笔最小入金（base units）；0 = 走默认 1 USDC。",
              "EVM 没有此参数，但 require(_amount >= E18)，即同样的 1 USDC 等价。"
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "position",
      "docs": [
        "用户在某 (settle_mint, pair_id, direction) 上的聚合仓位（direction: 0=LONG, 1=SHORT）。",
        "PDA seeds: [\"position\", settle_mint, pair_id_le_bytes, direction, owner]",
        "注意：seeds 必须包含 `owner`，否则全体用户会共享同一仓位账户（见审计 C-1）。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "owner",
            "docs": [
              "仓位所有者。"
            ],
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "docs": [
              "结算币 mint（用于区分多结算池）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "docs": [
              "交易对 ID（与 PairConfig.pair_id 对应）。"
            ],
            "type": "u16"
          },
          {
            "name": "direction",
            "docs": [
              "0 = LONG, 1 = SHORT。"
            ],
            "type": "u8"
          },
          {
            "name": "size",
            "docs": [
              "已开仓的合约总量（1e18 精度）。",
              "EVM: position.amount"
            ],
            "type": "u128"
          },
          {
            "name": "value",
            "docs": [
              "开仓时的总价值（= Σ deal_amount * deal_price / 1e18），用于计算均价。",
              "EVM: position.value"
            ],
            "type": "u128"
          },
          {
            "name": "freeze",
            "docs": [
              "已冻结于限价平仓单的数量（1e18 精度）。",
              "EVM: position.freeze"
            ],
            "type": "u128"
          },
          {
            "name": "margin",
            "docs": [
              "已占用的保证金（结算币最小单位，如 USDC lamports）。",
              "EVM: position.margin"
            ],
            "type": "u64"
          },
          {
            "name": "dealKeys",
            "docs": [
              "属于该仓位的 DealRecord PDA 地址列表，按开仓价格排序：",
              "- LONG: 升序（FIFO，先平最低价）",
              "- SHORT: 降序（LIFO，先平最高价）",
              "最多 MAX_DEALS_PER_POSITION 条。"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "registerPairArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "docs": [
              "全局唯一交易对 ID（如 1 = BTC/USDC）。"
            ],
            "type": "u16"
          },
          {
            "name": "name",
            "docs": [
              "显示名称（≤32 字节）。"
            ],
            "type": "string"
          },
          {
            "name": "multi",
            "docs": [
              "价格乘数（1e9 精度，0 = 用默认 1e9）。处理像 SHIB 这种价格 << 1 的情况。"
            ],
            "type": "u64"
          },
          {
            "name": "tradingFeeRate",
            "docs": [
              "单笔交易手续费率（1e9 精度，0 = 用 PairConfig::DEFAULT_TRADING_FEE_RATE）。"
            ],
            "type": "u64"
          },
          {
            "name": "minOrderAmount",
            "docs": [
              "单笔最小开仓张数（1e9 精度，0 = 用默认；保留 u128，与 amount 同域）。"
            ],
            "type": "u128"
          },
          {
            "name": "defaultLeverage",
            "docs": [
              "默认杠杆（1e9 精度，例 10x = 10e9）。用户首次开仓未设 UserLeverage 时取它。"
            ],
            "type": "u64"
          },
          {
            "name": "lotMulti",
            "docs": [
              "单笔最小增量（1e9 精度，0 = 用默认；保留 u128，与 amount 同域）。"
            ],
            "type": "u128"
          },
          {
            "name": "status",
            "docs": [
              "0 = 正常；1 = 暂停（仅允许平仓）；2 = 完全下线。"
            ],
            "type": "u8"
          },
          {
            "name": "rewardGas",
            "docs": [
              "keeper 触发本对挂单时领取的奖励（base units）。"
            ],
            "type": "u64"
          },
          {
            "name": "pythFeedId",
            "docs": [
              "Pyth feed id（32 字节，决定喂哪条价格）。",
              "用户自带 PriceUpdateV2 账户调 trade ix；合约校验该账户内的 feed_id == 此字段。"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "maxStalenessSecs",
            "docs": [
              "价格最大过时秒数；超过则拒接报价。"
            ],
            "type": "u64"
          },
          {
            "name": "maxConfidenceBps",
            "docs": [
              "价格置信区间上限（bps，0 = 用默认）。conf/price > max 则拒。"
            ],
            "type": "u16"
          },
          {
            "name": "switchboardFeedAccount",
            "docs": [
              "Switchboard PullFeed 账户 Pubkey；Pubkey::default() 表示无 fallback。"
            ],
            "type": "pubkey"
          },
          {
            "name": "switchboardFeedHash",
            "docs": [
              "Switchboard feed_hash（32 字节）。"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "switchboardMaxStalenessSecs",
            "docs": [
              "Switchboard 价格新鲜度上限（0 = 复用 max_staleness_secs）。"
            ],
            "type": "u64"
          },
          {
            "name": "oracleMode",
            "docs": [
              "0 = PythOnly（默认）；1 = AutoFallback。"
            ],
            "type": "u8"
          },
          {
            "name": "oracleSource",
            "docs": [
              "当前生效预言机源：0=Pyth 1=Switchboard 2=Supra(预留) 3=Chainlink。"
            ],
            "type": "u8"
          },
          {
            "name": "chainlinkFeedId",
            "docs": [
              "Chainlink Data Streams feed id（32 字节；oracle_source=Chainlink 时必填非 0）。"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "seqCounter",
      "docs": [
        "每结算币的 Deal / LimitedOrder seq 分配器。",
        "PDA seeds: [\"seq_counter\", settle_mint]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "nextDealSeq",
            "docs": [
              "下一个可分配的 DealRecord seq。"
            ],
            "type": "u64"
          },
          {
            "name": "nextOrderSeq",
            "docs": [
              "下一个可分配的 LimitedOrder seq。"
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "setAddressesArgs",
      "docs": [
        "全部可选字段；None = 保持原值。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newAdmin",
            "docs": [
              "新 admin 地址；设置后下一次调用必须由新地址签。"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "riskFundAuthority",
            "docs": [
              "风险基金 vault 的授权地址（独立于 perp_vault_authority；可放冷钱包 / 多签）。"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "platformFeeAuthority",
            "docs": [
              "平台手续费 vault 的授权地址。"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "tradeFeeAuthority",
            "docs": [
              "交易手续费 vault 的授权地址（≠ platform；多签拆分）。"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "liquidityPoolProgram",
            "docs": [
              "liquidity_pool program ID — 用于 CPI 校验 `seeds::program`。"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "treasuryProgram",
            "docs": [
              "treasury program ID — 同上。"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "maintenanceMarginRate",
            "docs": [
              "维持保证金率（1e9 精度，例 10% = 1e8）。0 < v ≤ 1e9。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "minDepositAmount",
            "docs": [
              "最小入金额（base units）。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "toPlatformTradeFeePct",
            "docs": [
              "平台抽成比例（1e9 精度，0 ≤ v ≤ 1e9）。",
              "`trading_fee × to_platform_trade_fee_pct / 1e9 → platform_fee_vault`。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "mergeRemainingFeeToBuyback",
            "docs": [
              "是否把剩余 fee 合并给回购模块（v2 启用；v1 仅占位）。"
            ],
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "orderSwitch",
            "docs": [
              "下单类型「全局总闸」bitmask（bit0=市价, bit1=限价；1=允许）。必须 <= 0b11。",
              "这是一键关停所有 pair 某类下单的紧急开关（个别 pair 可再用 update_pair 覆盖）。"
            ],
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "settleConfig",
      "docs": [
        "每结算币配置（USDC/USDT...），可覆盖 GlobalConfig 全局参数。",
        "PDA seeds: [\"settle_config\", settle_mint]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "settleMint",
            "docs": [
              "结算币 SPL mint。"
            ],
            "type": "pubkey"
          },
          {
            "name": "vaultAuthorityBump",
            "docs": [
              "该结算币的金库 vault authority PDA 的 bump 缓存。"
            ],
            "type": "u8"
          },
          {
            "name": "maintenanceMarginRate",
            "docs": [
              "维持保证金率（覆盖全局；0 表示走全局值），1e9 精度。"
            ],
            "type": "u64"
          },
          {
            "name": "minDepositAmount",
            "docs": [
              "最小入金金额（0 表示走全局值）。"
            ],
            "type": "u64"
          },
          {
            "name": "defaultLeverage",
            "docs": [
              "默认杠杆（用户未单独设置时用此值），1e9 精度。"
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "docs": [
              "0 = active, 1 = paused（暂停 deposit/trade，允许 withdraw/close），2 = offline。"
            ],
            "type": "u8"
          },
          {
            "name": "riskFundAuthorityBump",
            "docs": [
              "risk_fund_vault 的 authority PDA bump 缓存（每个 settle_mint 一个独立 risk vault）。",
              "0 表示尚未 init_risk_fund_vault（清算路径因 vault 不存在 revert）。"
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "settleConfigInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "defaultLeverage",
            "type": "u64"
          },
          {
            "name": "minDepositAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "settleVaultInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "stopTakeArgs",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open",
            "fields": [
              {
                "name": "triggerPrice",
                "docs": [
                  "触发开仓的价格（必填 > 0）。"
                ],
                "type": "u64"
              },
              {
                "name": "openLimitPrice",
                "docs": [
                  "0 = 触发后 Market 开；>0 = Limit 开。"
                ],
                "type": "u64"
              },
              {
                "name": "gainTriggerPrice",
                "docs": [
                  "开仓后自动挂的 TP 触发价（0 = 不挂）。"
                ],
                "type": "u64"
              },
              {
                "name": "lossTriggerPrice",
                "docs": [
                  "开仓后自动挂的 SL 触发价（0 = 不挂）。"
                ],
                "type": "u64"
              }
            ]
          },
          {
            "name": "close",
            "fields": [
              {
                "name": "gainTriggerPrice",
                "docs": [
                  "TP 触发价（0 = 不设 TP）。"
                ],
                "type": "u64"
              },
              {
                "name": "gainLimitPrice",
                "docs": [
                  "0 = TP 触发后 Market 平；>0 = Limit 平。"
                ],
                "type": "u64"
              },
              {
                "name": "lossTriggerPrice",
                "docs": [
                  "SL 触发价（0 = 不设 SL）。"
                ],
                "type": "u64"
              },
              {
                "name": "lossLimitPrice",
                "docs": [
                  "0 = SL 触发后 Market 平；>0 = Limit 平。"
                ],
                "type": "u64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "stopTakeOrderArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u128"
          },
          {
            "name": "rewardGas",
            "type": "u64"
          },
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "goodTill",
            "type": "i64"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "variant",
            "type": {
              "defined": {
                "name": "stopTakeArgs"
              }
            }
          }
        ]
      }
    },
    {
      "name": "tradeFuturesArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "docs": [
              "交易对 ID（与 PairConfig.pair_id 对应）。"
            ],
            "type": "u16"
          },
          {
            "name": "amount",
            "docs": [
              "合约数量，1e18 精度。"
            ],
            "type": "u128"
          },
          {
            "name": "price",
            "docs": [
              "限价单时的目标价（1e18 精度 USD）；Market 时被忽略，oracle 报价为准。"
            ],
            "type": "u128"
          },
          {
            "name": "orderType",
            "docs": [
              "0 = Market（D5 唯一支持值）；1 = Limit（D8 启用）。"
            ],
            "type": "u8"
          },
          {
            "name": "direction",
            "docs": [
              "0 = LONG / 1 = SHORT。"
            ],
            "type": "u8"
          },
          {
            "name": "dealSeq",
            "docs": [
              "客户端预先读取 SeqCounter.next_deal_seq 后填入；handler 内会校验等于当前值。"
            ],
            "type": "u64"
          },
          {
            "name": "goodTill",
            "docs": [
              "限价 / 条件单的有效期 unix sec；Market 时被忽略。"
            ],
            "type": "i64"
          },
          {
            "name": "deadline",
            "docs": [
              "整笔 tx 的截止时间 unix sec；0 = 无截止。"
            ],
            "type": "i64"
          },
          {
            "name": "chainlinkReport",
            "docs": [
              "oracle_source=Chainlink(3) 时的签名 Data Streams report bytes；其余源传空 vec。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "tradeHistory",
      "docs": [
        "一笔具体 deal 的成交日志。",
        "",
        "EVM 对应：`IPerpetual.TradeHistory`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "dealSeq",
            "type": "u64"
          },
          {
            "name": "tradeType",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u128"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "tradingFee",
            "type": "u64"
          },
          {
            "name": "profit",
            "type": "u64"
          },
          {
            "name": "loss",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "transactionHistory",
      "docs": [
        "资金流动事件（手续费扣除、保证金转移、profit/loss 等）。",
        "",
        "EVM 对应：`ICommon.TransactionHistory`。D5 只在扣手续费时触发一次。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "receiver",
            "docs": [
              "0 表示 vault / program 内部账户。"
            ],
            "type": "pubkey"
          },
          {
            "name": "txType",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "treasuryConfig",
      "docs": [
        "treasury 全局 singleton 配置。PDA seeds: [\"treasury_config\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "admin",
            "docs": [
              "管理员（修改本配置）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "commonCommissionRate",
            "docs": [
              "普通邀请人佣金比例，1e9 精度（默认 1e8 = 10%）。"
            ],
            "type": "u64"
          },
          {
            "name": "topCommissionRate",
            "docs": [
              "顶级代理人佣金比例，1e9 精度（默认 5e8 = 50%）。"
            ],
            "type": "u64"
          },
          {
            "name": "platformTokenMint",
            "docs": [
              "平台代币 mint（用于 buyback 销毁）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "deadAddress",
            "docs": [
              "销毁地址（dead address）— 接收回购的平台币。"
            ],
            "type": "pubkey"
          },
          {
            "name": "perpCoreProgram",
            "docs": [
              "允许通过 CPI 调用本 program 的 perp_core program ID（CPI guard）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "vaultAuthorityBump",
            "docs": [
              "treasury_vault_authority PDA 的 bump 缓存（每个 settle_mint 一个 vault）。",
              "注意：这里只缓存 default settle_mint 的；多 settle 时 D10 改成每 settle_mint 独立 config。"
            ],
            "type": "u8"
          },
          {
            "name": "platformFeeAuthority",
            "docs": [
              "平台手续费收款 authority（perp_core 端 GlobalConfig.platform_fee_authority 同址）。",
              "CPI split 时部分手续费转到 platform_fee_vault（由这个 authority 拥有）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "tradeFeeAuthority",
            "docs": [
              "普通 trade_fee 收款 authority（与 perp_core GlobalConfig 同址）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "toPlatformTradeFeePct",
            "docs": [
              "平台手续费占比，1e9 精度（默认 0.2 * 1e9 = 20%）。",
              "与 perp_core::GlobalConfig.to_platform_trade_fee_pct 同义；treasury 也缓存一份避免 CPI 时再读取。"
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "triggerCondition",
      "docs": [
        "LimitedOrder 的触发条件（StopTake 必有；Limit 创建则 mean=0 表\"无条件\"）。",
        "PDA seeds: [\"trigger_cond\", settle_mint, order_seq_le_bytes]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "orderSeq",
            "docs": [
              "关联的 LimitedOrder.order_seq（冗余字段，便于反查）。"
            ],
            "type": "u64"
          },
          {
            "name": "mean",
            "docs": [
              "条件含义：",
              "- 0 = INVALID         —— 无条件（普通 limit order 留空 = 0）",
              "- 1 = PURE_CONDITION  —— stop_take 类条件单（待触发）",
              "- 2 = EXECUTE_AFTER   —— 触发后自动生成的子订单（如 stop_take_open 触发后再挂 TP/SL）",
              "- 3 = CANCELLED       —— 已取消",
              "- 4 = COMPLETED       —— 已触发并完成"
            ],
            "type": "u8"
          },
          {
            "name": "openLimitPrice",
            "type": "u64"
          },
          {
            "name": "gainTriggerPrice",
            "type": "u64"
          },
          {
            "name": "gainLimitPrice",
            "type": "u64"
          },
          {
            "name": "lossTriggerPrice",
            "type": "u64"
          },
          {
            "name": "lossLimitPrice",
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "triggerLimitCloseArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderSeq",
            "docs": [
              "要触发的 LimitedOrder 的 order_seq。"
            ],
            "type": "u64"
          },
          {
            "name": "dealSeq",
            "docs": [
              "keeper 选定的要关的 DealRecord 的 deal_seq。",
              "v1 约定：`limited_order.amount <= deal.remaining`。"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "triggerLimitOpenArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "dealSeq",
            "docs": [
              "客户端预读的 `SeqCounter.next_deal_seq`，链上校验。"
            ],
            "type": "u64"
          },
          {
            "name": "chainlinkReport",
            "docs": [
              "oracle_source=Chainlink(3) 时的签名 Data Streams report bytes；其余源传空 vec。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "triggerStopTakeCloseArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "dealSeq",
            "docs": [
              "要平的 DealRecord deal_id（client 选定）。"
            ],
            "type": "u64"
          },
          {
            "name": "closeAmountE18",
            "docs": [
              "关闭数量（1e18）；0 = 关 deal.remaining。"
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "triggerStopTakeOpenArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderSeq",
            "type": "u64"
          },
          {
            "name": "dealSeq",
            "docs": [
              "客户端预读的 `SeqCounter.next_deal_seq`；与 trigger_limit_open 一样，本 ix 不再读 SeqCounter PDA。",
              "keeper SDK 负责传一个未占用的 seq（建议读 indexer 拿 max+1）。"
            ],
            "type": "u64"
          },
          {
            "name": "chainlinkReport",
            "docs": [
              "oracle_source=Chainlink(3) 时的签名 Data Streams report bytes；其余源传空 vec。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "updatePairArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pairId",
            "docs": [
              "目标 pair_id；用于 PDA 路由（不可改自身）。"
            ],
            "type": "u16"
          },
          {
            "name": "name",
            "docs": [
              "显示名称（≤32 字节，对齐 EVM `name`）。后端要求**只传符号、不带 \"/USD\"**（如 \"BTC\"/\"ETH\"/\"SOL\"）。"
            ],
            "type": {
              "option": "string"
            }
          },
          {
            "name": "tradingFeeRate",
            "docs": [
              "手续费率（1e9 精度，≤ 1e9）。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "defaultLeverage",
            "docs": [
              "默认杠杆（1e9 精度，> 0）。改动只影响未来首次开仓 — 已存的 UserLeverage 不变。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "status",
            "docs": [
              "见模块 doc\"暂停 / 下线语义\"。"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "rewardGas",
            "docs": [
              "keeper 报酬。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maxStalenessSecs",
            "docs": [
              "Pyth 价格最大过时秒数（> 0）。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maxConfidenceBps",
            "docs": [
              "Pyth 置信区间上限。"
            ],
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "pythFeedId",
            "docs": [
              "切换 Pyth feed id（罕见；通常仅在 Pyth 重命名/迁移 feed 时使用）。"
            ],
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "minOrderAmount",
            "docs": [
              "单笔最小张数。"
            ],
            "type": {
              "option": "u128"
            }
          },
          {
            "name": "switchboardFeedAccount",
            "docs": [
              "切换 Switchboard PullFeed 账户。"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "switchboardFeedHash",
            "docs": [
              "切换 Switchboard feed_hash。"
            ],
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "switchboardMaxStalenessSecs",
            "docs": [
              "Switchboard staleness 阈值（0 = 复用 Pyth 的）。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "oracleMode",
            "docs": [
              "切换 oracle 模式（0=PythOnly, 1=AutoFallback）。",
              "这是 admin 熔断 fallback 的紧急开关。"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "oracleSource",
            "docs": [
              "切换当前生效预言机源（0=Pyth 1=Switchboard 2=Supra(预留) 3=Chainlink）。admin 主切换开关。"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "chainlinkFeedId",
            "docs": [
              "切换 Chainlink Data Streams feed id。"
            ],
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "orderOverrideMask",
            "docs": [
              "下单类型「单对覆盖掩码」bitmask（bit0=市价, bit1=限价）。必须 <= 0b11。",
              "bit 置 1 = 该类不再跟随全局总闸，改用 `order_override_value`；置 0 = 跟随全局。"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "orderOverrideValue",
            "docs": [
              "单对覆盖值 bitmask（仅 mask 置位 bit 生效，1=允许 0=禁止）。必须 <= 0b11。"
            ],
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "docs": [
        "用户在某个结算币下的保证金账户。",
        "PDA seeds: [\"user_account\", settle_mint, owner]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "owner",
            "docs": [
              "钱包所有者。"
            ],
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "docs": [
              "该账户对应的结算币 mint。"
            ],
            "type": "pubkey"
          },
          {
            "name": "depositAmount",
            "docs": [
              "权益基数：deposit 时 +amount；withdraw 时 -min(amount, deposit)；平仓/清算的 gain/loss/fee 也会调整。",
              "用作清算风控的 coverage 基数（**会随提现与盈亏变化，并非只增的累计入金**）。"
            ],
            "type": "u64"
          },
          {
            "name": "availableAmount",
            "docs": [
              "当前可用余额（未冻结）。"
            ],
            "type": "u64"
          },
          {
            "name": "marginAmount",
            "docs": [
              "已用保证金（占用在已开仓头寸中）。"
            ],
            "type": "u64"
          },
          {
            "name": "orderLocked",
            "docs": [
              "限价/条件单冻结部分。"
            ],
            "type": "u64"
          },
          {
            "name": "lastTime",
            "docs": [
              "最后操作时间戳（unix sec）。"
            ],
            "type": "i64"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "userAccountInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "userLeverage",
      "docs": [
        "用户对某 (settle_mint, pair_id) 的自定义杠杆；不存在时取 PairConfig.default_leverage。",
        "PDA seeds: [\"user_leverage\", settle_mint, pair_id_le_bytes, owner]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "leverage",
            "docs": [
              "用户设置的杠杆（**1e9 精度**，9dp 分支）。",
              "例：10x = 10 * 1e9 = 10_000_000_000。",
              "必须在 [1e9 (1x), pair_config.default_leverage] 范围内。",
              "",
              "**v2 重构候选：可降为 `u32` 或 `u16` + \"0.1x 单位\"** —— 当前 `compute_open_fees`",
              "把 leverage 直接除 1e18 取整数倍数使用（小数全丢），1e18 精度从未真正发挥。",
              "选 1e18 + u128 是为了与 EVM 端 `getFees` 公式精度对齐 + 与 price/fee_rate 等",
              "1e18 字段统一，避免边界转换。v2 接 Solana 原生协议（如 Drift API 兼容）时一并改。",
              "改动面：`fee.rs` 公式 + 所有 ix args + 30+ 测试字面量 `10 * E9`。"
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "withdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "availableAfter",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seedDealRecord",
      "type": "bytes",
      "value": "[100, 101, 97, 108, 95, 114, 101, 99, 111, 114, 100]"
    },
    {
      "name": "seedGlobalConfig",
      "docs": [
        "PDA seed prefixes（集中放，避免 magic strings 散落）。"
      ],
      "type": "bytes",
      "value": "[103, 108, 111, 98, 97, 108, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "seedKeeperRegistry",
      "type": "bytes",
      "value": "[107, 101, 101, 112, 101, 114, 95, 114, 101, 103, 105, 115, 116, 114, 121]"
    },
    {
      "name": "seedLimitedOrder",
      "type": "bytes",
      "value": "[108, 105, 109, 105, 116, 101, 100, 95, 111, 114, 100, 101, 114]"
    },
    {
      "name": "seedPairConfig",
      "type": "bytes",
      "value": "[112, 97, 105, 114, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "seedPosition",
      "type": "bytes",
      "value": "[112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      "name": "seedSeqCounter",
      "type": "bytes",
      "value": "[115, 101, 113, 95, 99, 111, 117, 110, 116, 101, 114]"
    },
    {
      "name": "seedSettleConfig",
      "type": "bytes",
      "value": "[115, 101, 116, 116, 108, 101, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "seedTriggerCondition",
      "type": "bytes",
      "value": "[116, 114, 105, 103, 103, 101, 114, 95, 99, 111, 110, 100]"
    },
    {
      "name": "seedUserAccount",
      "type": "bytes",
      "value": "[117, 115, 101, 114, 95, 97, 99, 99, 111, 117, 110, 116]"
    },
    {
      "name": "seedUserLeverage",
      "type": "bytes",
      "value": "[117, 115, 101, 114, 95, 108, 101, 118, 101, 114, 97, 103, 101]"
    },
    {
      "name": "seedVaultAuth",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116, 95, 97, 117, 116, 104]"
    }
  ]
};
