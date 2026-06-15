/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/liquidity_pool.json`.
 */
export type LiquidityPool = {
  "address": "2zRgfaNK4DCbbjHkd5pfaE9vwv9gnAP5DdeNDU8VWoTE",
  "metadata": {
    "name": "liquidityPool",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addMargin",
      "docs": [
        "LP 给特定 MakerDeal 追加保证金。"
      ],
      "discriminator": [
        211,
        238,
        238,
        90,
        223,
        228,
        228,
        76
      ],
      "accounts": [
        {
          "name": "maker",
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "lpAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "maker"
              }
            ]
          }
        },
        {
          "name": "makerDeal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  107,
                  101,
                  114,
                  95,
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "takerDealSeq"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "takerDealSeq",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeDeal",
      "docs": [
        "关闭一笔 MakerDeal（全 / 部分，仅 normal close；强平 D9 接入）。"
      ],
      "discriminator": [
        157,
        173,
        33,
        216,
        146,
        16,
        65,
        82
      ],
      "accounts": [
        {
          "name": "cpiAuthority",
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "makerDeal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  107,
                  101,
                  114,
                  95,
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.taker_deal_seq"
              }
            ]
          }
        },
        {
          "name": "lpAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "maker_deal.maker",
                "account": "makerDeal"
              }
            ]
          }
        },
        {
          "name": "lpPosition",
          "docs": [
            "仅公共池路径需要传（escrow LpAccount）；私有路径传 None。"
          ],
          "writable": true,
          "optional": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "closeDealArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initLpGlobalConfig",
      "docs": [
        "部署后一次性创建 LpGlobalConfig singleton（lp admin + 官方 perp_core program id）。",
        "无许可建池要从这里取强制写入 PoolConfig 的 perp_core_program。"
      ],
      "discriminator": [
        152,
        189,
        144,
        37,
        152,
        229,
        80,
        187
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "lpGlobalConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initLpGlobalConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initPoolConfig",
      "docs": [
        "初始化某个结算币的 pool config（每个 settle_mint 一次）。",
        "admin 路径（lp_global.admin 签名）：自定义 pool_type / escrow。",
        "无许可路径（不传 admin）：强制 PRIVATE 池 + 官方 perp_core_program + 默认参数 + 记录 creator。"
      ],
      "discriminator": [
        229,
        200,
        245,
        211,
        100,
        33,
        44,
        79
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "lpGlobalConfig",
          "docs": [
            "lp 全局配置 —— 取官方 perp_core_program（强制写入）+ admin（判定模式）。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
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
            "admin 路径：签名且 == lp_global.admin（自定义 public/mixed 池）。无许可路径：传 None。"
          ],
          "signer": true,
          "optional": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
            "Pool vault authority PDA — 仅派生 bump 写入 PoolConfig，不创建。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initPoolConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initPoolVault",
      "docs": [
        "创建 PoolVault + Escrow LpAccount（每个 settle_mint 一次）。"
      ],
      "discriminator": [
        202,
        16,
        192,
        207,
        207,
        57,
        145,
        224
      ],
      "accounts": [
        {
          "name": "poolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "perpCoreVaultToken",
          "docs": [
            "传递性闸门：要求 perp_core 的 `vault_token` 已存在 —— 即该 settle 市场已通过 perp_core 的",
            "「无许可开关 + freeze-authority 护栏」被合法创建。没有它就建不出 pool_vault，因此 lp 端",
            "无需重复 flag / freeze 检查；鉴权完全继承自 perp_core。用 `pool_config.perp_core_program`",
            "（建池时已强制 = 官方 id）派生，杜绝伪造。",
            "CHECK（Anchor）：必须是 perp_core 名下 [\"vault_token\", settle_mint] 的已初始化 TokenAccount。"
          ]
        },
        {
          "name": "vaultAuthority",
          "docs": [
            "vault_authority — 持有 PoolVault 的 PDA。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "poolVault",
          "docs": [
            "PoolVault token account — 由 vault_authority PDA 拥有，按 settle_mint 一份。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "escrowLpAccount",
          "docs": [
            "Escrow LpAccount — 公共池资金聚合账户。",
            "holder = PoolConfig.escrow_authority。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "pool_config.escrow_authority",
                "account": "poolConfig"
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
      "name": "initializeLpAccount",
      "docs": [
        "用户首次提供流动性前显式创建 LpAccount PDA。"
      ],
      "discriminator": [
        187,
        140,
        129,
        172,
        136,
        200,
        194,
        159
      ],
      "accounts": [
        {
          "name": "holder",
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "lpAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "holder"
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
      "name": "liquidateLp",
      "docs": [
        "keeper 标记 LP 为不可接单（防止 LP 总锁仓超容量时继续接新单）。"
      ],
      "discriminator": [
        184,
        134,
        42,
        9,
        9,
        99,
        65,
        25
      ],
      "accounts": [
        {
          "name": "keeper",
          "docs": [
            "调用方必须是池管理员（见审计 M-1：原先任意 signer 都能标记 LP 拒单）。",
            "keeper 自动风控应以 admin 身份运行，或由 admin 委派。"
          ],
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "docs": [
            "池配置 —— 校验调用方 == admin。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "lpAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "kind": "arg",
                "path": "args.lp_holder"
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
              "name": "liquidateLpArgs"
            }
          }
        }
      ]
    },
    {
      "name": "matchOrder",
      "docs": [
        "撮合一笔 taker 单：client 预选 1 个 LP，链上校验 + 创建 MakerDeal。"
      ],
      "discriminator": [
        95,
        230,
        21,
        6,
        114,
        23,
        41,
        111
      ],
      "accounts": [
        {
          "name": "cpiAuthority",
          "docs": [
            "perp_core 的 `vault_authority` PDA — 通过签名 + seeds::program 双重证明 CPI 来源。"
          ],
          "signer": true
        },
        {
          "name": "payer",
          "docs": [
            "谁付 MakerDeal PDA 租金。常规由 taker 出（perp_core 把 taker 转 signer 传进来）。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "lpAccount",
          "docs": [
            "被 client 预选的 LP（可以是私有 LP 或 escrow_authority 名下的 LpAccount）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "lp_account.holder",
                "account": "lpAccount"
              }
            ]
          }
        },
        {
          "name": "makerDeal",
          "docs": [
            "新 MakerDeal PDA — seed 含 taker_deal_seq，per-taker-deal 唯一。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  107,
                  101,
                  114,
                  95,
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "arg",
                "path": "args.taker_deal_seq"
              }
            ]
          }
        },
        {
          "name": "lpPosition",
          "docs": [
            "公共池路径才需要：escrow 在该 pair × taker_direction 的累计净仓位 PDA。",
            "私有路径 client 传 None 即可。"
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
              "name": "matchOrderArgs"
            }
          }
        }
      ]
    },
    {
      "name": "provide",
      "docs": [
        "LP 入金（private / public 由 `pool_side` 参数决定）。"
      ],
      "discriminator": [
        221,
        83,
        15,
        115,
        142,
        64,
        245,
        37
      ],
      "accounts": [
        {
          "name": "provider",
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "lpAccount",
          "docs": [
            "私有路径：provider 自己的 LpAccount（必须 mut + 已存在）。",
            "公共路径：可传任意已存在的 LpAccount（程序内会跳过；但为了 schema 统一，要求传 provider 自己的）。",
            "**简化决策**：D6 仅当 pool_side = PRIVATE 时检查 holder = provider；",
            "公共路径不要求传 lp_account（用 escrow_lp_account 即可），用 Option。"
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "escrowLpAccount",
          "docs": [
            "公共路径必传：escrow_authority 的 LpAccount（聚合公共池资金）。",
            "私有路径不需要传。"
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "pool_config.escrow_authority",
                "account": "poolConfig"
              }
            ]
          }
        },
        {
          "name": "publicShare",
          "docs": [
            "公共路径必传：provider 在公共池的份额账户（init_if_needed，首次入金创建）。"
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  98,
                  108,
                  105,
                  99,
                  95,
                  115,
                  104,
                  97,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "provider"
              }
            ]
          }
        },
        {
          "name": "providerTokenAccount",
          "docs": [
            "provider 的 token account。"
          ],
          "writable": true
        },
        {
          "name": "poolVault",
          "docs": [
            "PoolVault — 由 vault_authority PDA 拥有。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "poolSide",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setLpParams",
      "docs": [
        "LP 自定义风险参数（杠杆、维持保证金率等）。"
      ],
      "discriminator": [
        227,
        163,
        242,
        45,
        79,
        203,
        106,
        44
      ],
      "accounts": [
        {
          "name": "holder",
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "lpAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "poolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "setLpParamsArgs"
            }
          }
        }
      ]
    },
    {
      "name": "updatePoolConfig",
      "docs": [
        "admin 增量更新 PoolConfig（status / pool_type / min_provide_amount / perp_core_program）。",
        "与 perp_core 的 `update_pair` 对称；典型场景：紧急 pause、动态调最小入金、CPI guard 升级。",
        "不能改：settle_mint / escrow_authority / admin（会破坏 PDA seeds / 公共池资金路径）。"
      ],
      "discriminator": [
        68,
        236,
        203,
        122,
        179,
        62,
        234,
        252
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updatePoolConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "withdrawLp",
      "docs": [
        "LP 出金（private / public 由 `pool_side` 参数决定）。",
        "公共路径 `amount` 是销毁的份额数；私有路径 `amount` 是取出的 base units。"
      ],
      "discriminator": [
        225,
        221,
        45,
        211,
        49,
        60,
        51,
        163
      ],
      "accounts": [
        {
          "name": "holder",
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
        },
        {
          "name": "poolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "lpAccount",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "escrowLpAccount",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
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
                "path": "pool_config.escrow_authority",
                "account": "poolConfig"
              }
            ]
          }
        },
        {
          "name": "publicShare",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  117,
                  98,
                  108,
                  105,
                  99,
                  95,
                  115,
                  104,
                  97,
                  114,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "settleMint"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "holderTokenAccount",
          "writable": true
        },
        {
          "name": "poolVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "vaultAuthority",
          "docs": [
            "vault_authority — 签 SPL transfer。"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108,
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
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "poolSide",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "lpAccount",
      "discriminator": [
        23,
        166,
        251,
        222,
        23,
        27,
        215,
        48
      ]
    },
    {
      "name": "lpGlobalConfig",
      "discriminator": [
        166,
        217,
        55,
        31,
        214,
        254,
        200,
        85
      ]
    },
    {
      "name": "lpPosition",
      "discriminator": [
        105,
        241,
        37,
        200,
        224,
        2,
        252,
        90
      ]
    },
    {
      "name": "makerDeal",
      "discriminator": [
        218,
        11,
        14,
        132,
        168,
        138,
        56,
        96
      ]
    },
    {
      "name": "poolConfig",
      "discriminator": [
        26,
        108,
        14,
        123,
        116,
        230,
        129,
        43
      ]
    },
    {
      "name": "publicShare",
      "discriminator": [
        58,
        142,
        19,
        154,
        246,
        12,
        243,
        22
      ]
    }
  ],
  "events": [
    {
      "name": "addMargin",
      "discriminator": [
        233,
        254,
        34,
        205,
        165,
        70,
        190,
        141
      ]
    },
    {
      "name": "balanceOfMaker",
      "discriminator": [
        203,
        63,
        35,
        138,
        46,
        38,
        65,
        200
      ]
    },
    {
      "name": "closeMakerDealInPool",
      "discriminator": [
        10,
        190,
        0,
        54,
        73,
        51,
        126,
        122
      ]
    },
    {
      "name": "lockPoolMargin",
      "discriminator": [
        26,
        218,
        109,
        67,
        198,
        116,
        130,
        117
      ]
    },
    {
      "name": "lpAccountInitialized",
      "discriminator": [
        49,
        176,
        126,
        171,
        31,
        11,
        212,
        214
      ]
    },
    {
      "name": "lpGlobalConfigInitialized",
      "discriminator": [
        24,
        44,
        66,
        67,
        137,
        181,
        213,
        48
      ]
    },
    {
      "name": "lpParamsUpdated",
      "discriminator": [
        54,
        236,
        196,
        237,
        83,
        125,
        251,
        124
      ]
    },
    {
      "name": "poolConfigInitialized",
      "discriminator": [
        229,
        220,
        87,
        241,
        175,
        165,
        198,
        28
      ]
    },
    {
      "name": "poolConfigUpdated",
      "discriminator": [
        206,
        33,
        29,
        8,
        84,
        84,
        130,
        39
      ]
    },
    {
      "name": "poolVaultInitialized",
      "discriminator": [
        160,
        18,
        48,
        172,
        183,
        112,
        51,
        109
      ]
    },
    {
      "name": "provide",
      "discriminator": [
        108,
        192,
        55,
        102,
        60,
        30,
        245,
        223
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        192,
        241,
        201,
        217,
        70,
        150,
        90,
        247
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
      "name": "notLpHolder",
      "msg": "Caller is not the LP account holder"
    },
    {
      "code": 6002,
      "name": "notPerpCore",
      "msg": "Caller is not the perp_core program (CPI guard)"
    },
    {
      "code": 6003,
      "name": "invalidPoolType",
      "msg": "Invalid pool type (1=PUBLIC 2=PRIVATE 3=MIXED 4=REFUSE)"
    },
    {
      "code": 6004,
      "name": "invalidStatus",
      "msg": "Invalid status"
    },
    {
      "code": 6005,
      "name": "settleMintZero",
      "msg": "Settle mint cannot be zero"
    },
    {
      "code": 6006,
      "name": "versionMismatch",
      "msg": "Account version mismatch"
    },
    {
      "code": 6007,
      "name": "amountZero",
      "msg": "Amount must be > 0"
    },
    {
      "code": 6008,
      "name": "provideAmountTooSmall",
      "msg": "Provide amount is below the configured minimum"
    },
    {
      "code": 6009,
      "name": "invalidPoolSide",
      "msg": "Pool side flag must be 1 (PUBLIC) or 2 (PRIVATE)"
    },
    {
      "code": 6010,
      "name": "poolSideNotAccepted",
      "msg": "This pool does not accept the requested side (public/private mismatch)"
    },
    {
      "code": 6011,
      "name": "escrowSelfOp",
      "msg": "Escrow authority cannot provide / withdraw via LP entry points"
    },
    {
      "code": 6012,
      "name": "poolPaused",
      "msg": "Pool is paused; provide / withdraw disabled"
    },
    {
      "code": 6013,
      "name": "settleMintMismatch",
      "msg": "Settle mint does not match the pool config"
    },
    {
      "code": 6014,
      "name": "lpHolderMismatch",
      "msg": "LP account does not belong to the holder"
    },
    {
      "code": 6015,
      "name": "lpAlreadyInitialized",
      "msg": "LP account already initialized"
    },
    {
      "code": 6016,
      "name": "insufficientLpAvailable",
      "msg": "Insufficient available LP balance"
    },
    {
      "code": 6017,
      "name": "withdrawLeavesDustyAccount",
      "msg": "Withdraw would leave the private LP account below the minimum mint amount"
    },
    {
      "code": 6018,
      "name": "publicPoolEmpty",
      "msg": "Public pool has zero total shares; cannot compute share price"
    },
    {
      "code": 6019,
      "name": "insufficientPublicShares",
      "msg": "Insufficient public shares"
    },
    {
      "code": 6020,
      "name": "lpLeverageOutOfRange",
      "msg": "Leverage out of range (1x..=100x)"
    },
    {
      "code": 6021,
      "name": "lpMaintenanceMarginRateOutOfRange",
      "msg": "Maintenance margin rate must be ≤ 1e18 (100%)"
    },
    {
      "code": 6022,
      "name": "lpAddMarginRateOutOfRange",
      "msg": "Add margin rate must be ≤ 1e18 (100%)"
    },
    {
      "code": 6023,
      "name": "makerDealNotLocked",
      "msg": "MakerDeal is not locked or already closed"
    },
    {
      "code": 6024,
      "name": "makerDealNotOwned",
      "msg": "MakerDeal does not belong to the caller"
    },
    {
      "code": 6025,
      "name": "lpRejectingOrders",
      "msg": "LP is rejecting new orders (reject_order = true)"
    },
    {
      "code": 6026,
      "name": "lpAvailableInsufficient",
      "msg": "LP has insufficient available balance to take this order"
    },
    {
      "code": 6027,
      "name": "makerLossExceedsLpCapacity",
      "msg": "Maker P/L exceeds LP available + locked; risk fund tap is D9 work"
    },
    {
      "code": 6028,
      "name": "invalidCpiAuthority",
      "msg": "CPI authority does not match perp_core's vault_authority PDA"
    },
    {
      "code": 6029,
      "name": "makerDealKeyMismatch",
      "msg": "MakerDeal pair_id / settle_mint mismatch"
    },
    {
      "code": 6030,
      "name": "lpPositionMissing",
      "msg": "LpPosition required for escrow path but missing"
    },
    {
      "code": 6031,
      "name": "lpPositionMismatch",
      "msg": "LpPosition pair_id / direction mismatch"
    },
    {
      "code": 6032,
      "name": "closeAmountExceedsDealSize",
      "msg": "Close amount exceeds MakerDeal size"
    },
    {
      "code": 6033,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "addMargin",
      "docs": [
        "EVM 对应：`IPool.AddMargin`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "account",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "takerDealSeq",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "marginAfter",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "balanceOfMaker",
      "docs": [
        "EVM 对应：`IPool.BalanceOfMaker`。每个修改 LpAccount 的 ix 前后各发一次。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "holder",
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
            "name": "availableAmount",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "maintenanceMargin",
            "type": "u64"
          },
          {
            "name": "share",
            "docs": [
              "仅 escrow LP 有意义（= PoolConfig.total_shares）；其他 = 0。"
            ],
            "type": "u64"
          },
          {
            "name": "stage",
            "docs": [
              "0 = 入口, 10 = 出口；其他值（3 / 11 / 12 / 13）见 EVM 注释。"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "closeDealArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "takerDealSeq",
            "type": "u64"
          },
          {
            "name": "closeType",
            "docs": [
              "0 = normal close（D7 唯一支持值）；1 = liquidate（D9）。"
            ],
            "type": "u8"
          },
          {
            "name": "closeAmountE18",
            "docs": [
              "关闭数量（1e18）；0 表示 full close（按 MakerDeal.size 关）。"
            ],
            "type": "u128"
          },
          {
            "name": "closePriceE18",
            "docs": [
              "成交价（1e9，仅用于事件 / indexer；账务由 perp_core 算好 P/L 传进来）。"
            ],
            "type": "u64"
          },
          {
            "name": "takerProfitBase",
            "docs": [
              "taker 视角的盈亏（base units），由 perp_core 算好传进来。",
              "互斥：要么 profit > 0 & loss = 0，要么 loss > 0 & profit = 0，要么都 = 0。"
            ],
            "type": "u64"
          },
          {
            "name": "takerLossBase",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "closeMakerDealInPool",
      "docs": [
        "单笔 MakerDeal 关闭事件。",
        "",
        "EVM 对应：`IPool.CloseMakerDealInPool`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "takerDealSeq",
            "type": "u64"
          },
          {
            "name": "maker",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "closeSize",
            "type": "u128"
          },
          {
            "name": "closePrice",
            "type": "u64"
          },
          {
            "name": "makerGain",
            "type": "u64"
          },
          {
            "name": "makerLoss",
            "type": "u64"
          },
          {
            "name": "closeFully",
            "docs": [
              "1 = full, 2 = partial"
            ],
            "type": "u8"
          },
          {
            "name": "closeType",
            "docs": [
              "EVM CloseMakerDealInPool 第二个 flag：",
              "1 = private normal, 2 = private force, 3 = public normal,",
              "4 = public force, 5 = move pool"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "initLpGlobalConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "lp 管理员（admin 路径建 public/mixed 池）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "perpCoreProgram",
            "docs": [
              "官方 perp_core program id（无许可建池强制写入 PoolConfig.perp_core_program）。"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "initPoolConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "admin 路径下设为 `pool_config.admin`（可委托给另一地址）。无许可路径忽略。"
            ],
            "type": "pubkey"
          },
          {
            "name": "poolType",
            "docs": [
              "admin 路径有效（1..=4）。无许可路径强制 PRIVATE。"
            ],
            "type": "u8"
          },
          {
            "name": "escrowAuthority",
            "docs": [
              "admin 路径有效。无许可路径强制 Pubkey::default()。"
            ],
            "type": "pubkey"
          },
          {
            "name": "status",
            "docs": [
              "admin 路径有效（0..=2）。无许可路径强制 0（active）。"
            ],
            "type": "u8"
          },
          {
            "name": "privateMinProvideAmount",
            "docs": [
              "私有池单笔最小入金（base units）。0 → 默认 1 USDC。无许可路径强制默认。"
            ],
            "type": "u64"
          },
          {
            "name": "publicMinProvideAmount",
            "docs": [
              "公共池单笔最小入金（base units）。0 → 默认 1 USDC。无许可路径强制默认。"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "liquidateLpArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lpHolder",
            "docs": [
              "被清算的 LP holder（lp_account.holder）。"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "lockPoolMargin",
      "docs": [
        "LP 接到一笔新的对手单 → 锁仓事件。",
        "",
        "EVM 对应：`IPool.LockPoolMargin`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "takerDealSeq",
            "type": "u64"
          },
          {
            "name": "maker",
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
            "name": "direction",
            "type": "u8"
          },
          {
            "name": "size",
            "type": "u128"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "marginAmount",
            "type": "u64"
          },
          {
            "name": "maintenanceMargin",
            "type": "u64"
          },
          {
            "name": "flag",
            "docs": [
              "1 = 公共池(maker=escrow), 2 = 私有池"
            ],
            "type": "u8"
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
      "name": "lpAccountInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "leverage",
            "type": "u64"
          },
          {
            "name": "maintenanceMarginRate",
            "type": "u64"
          },
          {
            "name": "autoAddMargin",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "lpGlobalConfig",
      "docs": [
        "liquidity_pool 全局 singleton。PDA seeds: [\"lp_global_config\"]",
        "",
        "两个用途：",
        "1. `admin` —— lp 管理员，走「admin 路径」创建 public/mixed 池（自定义 pool_type / escrow）。",
        "2. `perp_core_program` —— 官方 perp_core program id。无许可建池时**强制**写进",
        "`PoolConfig.perp_core_program`，使 `match_order` 的 `seeds::program` CPI guard 永远",
        "指向真正的 perp_core，杜绝创建者伪造结算程序来操纵做市方资金。"
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
              "liquidity_pool 管理员。"
            ],
            "type": "pubkey"
          },
          {
            "name": "perpCoreProgram",
            "docs": [
              "官方 perp_core program id（CPI guard 真源）。"
            ],
            "type": "pubkey"
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
      "name": "lpGlobalConfigInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "perpCoreProgram",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "lpParamsUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "leverage",
            "type": "u64"
          },
          {
            "name": "maintenanceMarginRate",
            "type": "u64"
          },
          {
            "name": "addMarginRate",
            "type": "u64"
          },
          {
            "name": "autoAddMargin",
            "type": "bool"
          },
          {
            "name": "rejectOrder",
            "type": "bool"
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
      "name": "matchOrderArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taker",
            "docs": [
              "taker 钱包（仅用作 MakerDeal 反查；与 maker 无关）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "pairId",
            "type": "u16"
          },
          {
            "name": "takerDirection",
            "docs": [
              "taker 方向（1=LONG, 2=SHORT，对齐 EVM）；maker 是相反方向。"
            ],
            "type": "u8"
          },
          {
            "name": "amountE18",
            "docs": [
              "合约张数，1e9 精度（保留 u128：极大供应币）。字段名保留 `_e18` 减少跨 program 改名。"
            ],
            "type": "u128"
          },
          {
            "name": "priceE18",
            "docs": [
              "成交价，1e9 USD。"
            ],
            "type": "u64"
          },
          {
            "name": "takerDealSeq",
            "docs": [
              "perp_core 端 SeqCounter 分配的 deal_seq；用于 MakerDeal PDA 派生。"
            ],
            "type": "u64"
          },
          {
            "name": "poolDefaultLeverageE18",
            "docs": [
              "池子全局默认杠杆（用于 LP 自定义 = 0 时 fallback），1e9 精度。"
            ],
            "type": "u64"
          },
          {
            "name": "poolDefaultMmrE18",
            "docs": [
              "同上：维持保证金率默认值（1e9 精度）。"
            ],
            "type": "u64"
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
            "name": "creator",
            "docs": [
              "创建者（对齐 EVM `pool.creator = msg.sender`）。",
              "admin 路径 = lp_global.admin；无许可路径 = payer（同时也是 pool_config.admin，可自管私有池）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "reserved",
            "docs": [
              "升级预留（从 64 借 32 字节给 creator）。"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "poolConfigInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "poolType",
            "type": "u8"
          },
          {
            "name": "perpCoreProgram",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "docs": [
              "创建者（admin 路径 = lp_global.admin；无许可路径 = payer）。"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "poolConfigUpdated",
      "docs": [
        "PoolConfig 字段变更后 emit；indexer 应 re-fetch 全字段（事件不带 diff）。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "poolType",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "poolVaultInitialized",
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
      "name": "provide",
      "docs": [
        "EVM 对应：`IPool.Provide`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "account",
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
            "name": "poolSide",
            "docs": [
              "1 = PUBLIC, 2 = PRIVATE。"
            ],
            "type": "u8"
          },
          {
            "name": "sharesMinted",
            "docs": [
              "公共池：本次铸造的份额；私有池：0。"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "publicShare",
      "docs": [
        "用户在公共池的份额账户。net_value(per share) = escrow.amount / total_shares（base units）。",
        "PDA seeds: [\"public_share\", settle_mint, holder]"
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
              "持有者钱包。"
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
            "name": "shares",
            "docs": [
              "持有的份额数（u64，与 PoolConfig.total_shares 同口径；首充 1:1 = base units，非 1e18）。"
            ],
            "type": "u64"
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
      "name": "setLpParamsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "leverage",
            "docs": [
              "杠杆（1e9 精度，例 10x = 10e9）。允许 [1e9, 100e9]。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maintenanceMarginRate",
            "docs": [
              "维持保证金率（1e9 精度）。允许 (0, 1e9]。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "addMarginRate",
            "docs": [
              "追加保证金率（1e9 精度）。允许 (0, 1e9]。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "autoAddMargin",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "rejectOrder",
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "updatePoolConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "status",
            "docs": [
              "0 = active；1 = paused（停 provide / match_order）；2 = offline。"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "poolType",
            "docs": [
              "1=PUBLIC 2=PRIVATE 3=MIXED 4=REFUSE。"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "privateMinProvideAmount",
            "docs": [
              "私有池最小入金（base units）。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "publicMinProvideAmount",
            "docs": [
              "公共池最小入金（base units）。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "perpCoreProgram",
            "docs": [
              "CPI guard 用的 perp_core program ID（升级时偶尔会用）。"
            ],
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "withdraw",
      "docs": [
        "EVM 对应：`IPool.Withdraw`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "account",
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
            "name": "poolSide",
            "type": "u8"
          },
          {
            "name": "sharesBurned",
            "docs": [
              "公共池：本次销毁的份额；私有池：0。"
            ],
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seedLpAccount",
      "type": "bytes",
      "value": "[108, 112, 95, 97, 99, 99, 111, 117, 110, 116]"
    },
    {
      "name": "seedLpPosition",
      "type": "bytes",
      "value": "[108, 112, 95, 112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      "name": "seedMakerDeal",
      "type": "bytes",
      "value": "[109, 97, 107, 101, 114, 95, 100, 101, 97, 108]"
    },
    {
      "name": "seedPoolConfig",
      "type": "bytes",
      "value": "[112, 111, 111, 108, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "seedPoolVaultAuth",
      "type": "bytes",
      "value": "[112, 111, 111, 108, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104]"
    },
    {
      "name": "seedPoolVaultToken",
      "type": "bytes",
      "value": "[112, 111, 111, 108, 95, 118, 97, 117, 108, 116, 95, 116, 111, 107, 101, 110]"
    },
    {
      "name": "seedPublicShare",
      "type": "bytes",
      "value": "[112, 117, 98, 108, 105, 99, 95, 115, 104, 97, 114, 101]"
    }
  ]
};
