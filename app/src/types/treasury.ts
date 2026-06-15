/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/treasury.json`.
 */
export type Treasury = {
  "address": "JAX56qnm1CXf1zsMCfPAEscDLxgEZnYkNW7hsSdNX9xY",
  "metadata": {
    "name": "treasury",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "bindInviter",
      "docs": [
        "用户绑定自己的邀请人（一次性）。"
      ],
      "discriminator": [
        230,
        31,
        56,
        81,
        218,
        22,
        21,
        0
      ],
      "accounts": [
        {
          "name": "invitee",
          "writable": true,
          "signer": true
        },
        {
          "name": "inviteRelation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  105,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "invitee"
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
          "name": "inviter",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "claimCommission",
      "docs": [
        "邀请人提取累计佣金（清零 total_unclaimed）。"
      ],
      "discriminator": [
        12,
        9,
        15,
        170,
        155,
        235,
        124,
        254
      ],
      "accounts": [
        {
          "name": "inviter",
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
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
            ]
          }
        },
        {
          "name": "commissionAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "inviter"
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "treasuryVault",
          "writable": true,
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
          "name": "treasuryVaultAuthority",
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
          "name": "inviterTokenAccount",
          "docs": [
            "inviter 收款 token account。"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initTreasuryConfig",
      "docs": [
        "Admin 一次性创建 TreasuryConfig singleton。"
      ],
      "discriminator": [
        226,
        79,
        33,
        198,
        207,
        92,
        29,
        72
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasuryConfig",
          "writable": true,
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
              "name": "initTreasuryConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initTreasuryVault",
      "docs": [
        "Admin 创建给定 settle_mint 的 3 个 vault（treasury / platform / trade_fee）。"
      ],
      "discriminator": [
        136,
        50,
        206,
        62,
        144,
        161,
        93,
        19
      ],
      "accounts": [
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
            "传递性闸门：要求 perp_core 的 `vault_token` 已存在 —— 即该 settle 市场已经通过",
            "perp_core 的「无许可开关 + freeze-authority 护栏」被合法创建。没有 settle 市场就建不出",
            "treasury vault（无许可关停时拿不到 vault_token；freeze mint 在 init_settle_vault 已被拒）。",
            "因此 treasury 端无需再读 flag / 重复 freeze 检查，鉴权完全继承自 perp_core。",
            "CHECK（Anchor）：必须是 perp_core 名下 [\"vault_token\", settle_mint] 的已初始化 TokenAccount。"
          ]
        },
        {
          "name": "vaultAuthority",
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
          "name": "treasuryVault",
          "docs": [
            "累计佣金池（→ claim_commission 时打款给 inviter）。"
          ],
          "writable": true,
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
          "name": "platformFeeVault",
          "docs": [
            "平台手续费池（platform_fee 分成累计）。",
            "seeds 用 \"platform_vault\" 前缀，避开 treasury_vault 的冲突。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
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
          "name": "tradeFeeVault",
          "docs": [
            "普通 trade_fee 池（剩余分成累计）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  95,
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
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
      "name": "setTokenTopAgent",
      "docs": [
        "Admin 设置 / 取消某地址在某 settle_mint 下的\"顶级代理（top agent）\"资格白名单。",
        "对应 EVM `MarketAgent.setTokenTopAgent`；批量由 client 循环调用本指令。",
        "Phase 1：仅白名单 PDA + 事件；返佣资金分账在 Phase 2 接入 split_trade_fee。"
      ],
      "discriminator": [
        243,
        142,
        168,
        122,
        28,
        52,
        247,
        177
      ],
      "accounts": [
        {
          "name": "treasuryConfig",
          "docs": [
            "校验 admin —— 只有 treasury_config.admin 可设置 top agent。"
          ],
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
            ]
          }
        },
        {
          "name": "admin",
          "docs": [
            "admin 签名 + 出 TopAgent PDA 首次创建的租金。"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "treasuryConfig"
          ]
        },
        {
          "name": "settleMint",
          "docs": [
            "维度：结算币 mint（对应 EVM token 维度）。"
          ]
        },
        {
          "name": "topAgent",
          "docs": [
            "反复设 / 取消 → init_if_needed（首次创建，后续覆盖 approved）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  112,
                  95,
                  97,
                  103,
                  101,
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
                "path": "agent"
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
          "name": "agent",
          "type": "pubkey"
        },
        {
          "name": "approval",
          "type": "bool"
        }
      ]
    },
    {
      "name": "splitTradeFee",
      "docs": [
        "perp_core CPI 进来分手续费（commission / platform_fee / trade_fee）。",
        "只能由 perp_core 的 vault_authority PDA 签名调用。"
      ],
      "discriminator": [
        22,
        16,
        202,
        87,
        72,
        76,
        69,
        205
      ],
      "accounts": [
        {
          "name": "cpiAuthority",
          "docs": [
            "perp_core 的 `vault_authority` PDA —— CPI guard（签名 + seeds::program 双校验）。"
          ],
          "signer": true
        },
        {
          "name": "payer",
          "docs": [
            "谁付 CommissionAccount PDA 的租金（首次新 inviter+settle_mint 创建时）。",
            "perp_core CPI 时 taker 是签名者，让 taker 出 PDA 租金。"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "settleMint"
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
            ]
          }
        },
        {
          "name": "sourceVault",
          "docs": [
            "perp_core 端的 vault token（fee 来源）。",
            "注意：seeds 用 perp_core 端的前缀 \"vault_token\"，验证它是 perp_core 名下的 PDA。"
          ],
          "writable": true
        },
        {
          "name": "platformFeeVault",
          "docs": [
            "platform_fee 累计池（treasury 端）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  116,
                  102,
                  111,
                  114,
                  109,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
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
          "name": "tradeFeeVault",
          "docs": [
            "trade_fee 累计池（treasury 端）。"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  101,
                  95,
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
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
          "name": "treasuryVault",
          "docs": [
            "累计佣金池（→ 给已绑定 inviter 的 commission；如果没 inviter 则不动）。"
          ],
          "writable": true,
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
          "name": "inviteRelation",
          "docs": [
            "invitee 的邀请关系（可选；None 表示 taker 未绑定 inviter）。"
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  105,
                  116,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "args.taker"
              }
            ]
          }
        },
        {
          "name": "commissionAccount",
          "docs": [
            "inviter 在 settle_mint 下的累计佣金账户（仅当 invite_relation Some 时 init_if_needed）。"
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "inviteRelation"
              },
              {
                "kind": "account",
                "path": "settleMint"
              }
            ]
          }
        },
        {
          "name": "inviterInviteRelation",
          "docs": [
            "inviter（A）自己的邀请关系 —— 用于校验 top agent 是 A 的直接上级 B（情况B）。",
            "seeds = [\"invite\", A]，A = invite_relation.inviter；invite_relation 为 None 时占位回退到 taker。"
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  105,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "inviteRelation"
              }
            ]
          }
        },
        {
          "name": "topAgent",
          "docs": [
            "top agent 白名单标记 PDA。handler 手动校验 PDA 地址（seeds 含 agent 字段，无法在此约束）。",
            "Anchor 仍校验 owner == treasury + discriminator == TopAgent。"
          ],
          "optional": true
        },
        {
          "name": "topCommissionAccount",
          "docs": [
            "情况B（top == A 的上级 B）的累计佣金账户。情况A（top == A）时传 None（并入 commission_account）。",
            "seeds = [\"commission\", top_agent.agent, settle_mint]。"
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "topAgent"
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
          "name": "args",
          "type": {
            "defined": {
              "name": "splitTradeFeeArgs"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "commissionAccount",
      "discriminator": [
        116,
        213,
        236,
        120,
        239,
        84,
        194,
        33
      ]
    },
    {
      "name": "inviteRelation",
      "discriminator": [
        60,
        95,
        96,
        169,
        183,
        180,
        55,
        63
      ]
    },
    {
      "name": "topAgent",
      "discriminator": [
        108,
        143,
        141,
        153,
        53,
        123,
        239,
        105
      ]
    },
    {
      "name": "treasuryConfig",
      "discriminator": [
        124,
        54,
        212,
        227,
        213,
        189,
        168,
        41
      ]
    }
  ],
  "events": [
    {
      "name": "commissionClaimed",
      "discriminator": [
        39,
        106,
        107,
        183,
        92,
        78,
        148,
        99
      ]
    },
    {
      "name": "inviterBound",
      "discriminator": [
        197,
        1,
        235,
        195,
        86,
        219,
        167,
        0
      ]
    },
    {
      "name": "setTokenTopAgent",
      "discriminator": [
        242,
        77,
        183,
        34,
        129,
        50,
        81,
        1
      ]
    },
    {
      "name": "tradeFeeSplit",
      "discriminator": [
        113,
        75,
        98,
        103,
        110,
        8,
        140,
        254
      ]
    },
    {
      "name": "treasuryConfigInitialized",
      "discriminator": [
        230,
        157,
        184,
        220,
        165,
        148,
        199,
        117
      ]
    },
    {
      "name": "treasuryVaultInitialized",
      "discriminator": [
        152,
        108,
        31,
        158,
        59,
        40,
        109,
        149
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
      "name": "versionMismatch",
      "msg": "Account version mismatch"
    },
    {
      "code": 6002,
      "name": "invalidCommissionRate",
      "msg": "Invalid commission rate (must be <= 1e18)"
    },
    {
      "code": 6003,
      "name": "platformTokenZero",
      "msg": "Platform token mint cannot be zero"
    },
    {
      "code": 6004,
      "name": "deadAddressZero",
      "msg": "Dead address cannot be zero"
    },
    {
      "code": 6005,
      "name": "inviterEqualsInvitee",
      "msg": "Inviter cannot be the same as invitee"
    },
    {
      "code": 6006,
      "name": "inviterZero",
      "msg": "Inviter cannot be the default (zero) Pubkey"
    },
    {
      "code": 6007,
      "name": "inviterAlreadyBound",
      "msg": "Invitee already bound to an inviter"
    },
    {
      "code": 6008,
      "name": "inviterMismatch",
      "msg": "Inviter does not match CommissionAccount holder"
    },
    {
      "code": 6009,
      "name": "settleMintMismatch",
      "msg": "Settle mint mismatch"
    },
    {
      "code": 6010,
      "name": "insufficientUnclaimed",
      "msg": "Insufficient unclaimed commission"
    },
    {
      "code": 6011,
      "name": "amountZero",
      "msg": "Amount must be > 0"
    },
    {
      "code": 6012,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6013,
      "name": "invalidCpiAuthority",
      "msg": "CPI authority does not match perp_core's vault_authority PDA"
    },
    {
      "code": 6014,
      "name": "invalidSourceVault",
      "msg": "Source vault account is not a perp_core vault"
    },
    {
      "code": 6015,
      "name": "invalidDestVault",
      "msg": "Destination vault account mismatch"
    },
    {
      "code": 6016,
      "name": "invalidPercentage",
      "msg": "Percentage (e.g. platform_fee_pct) must be <= 1e18"
    },
    {
      "code": 6017,
      "name": "topAgentZero",
      "msg": "Top agent address cannot be the default (zero) Pubkey"
    },
    {
      "code": 6018,
      "name": "topAgentPdaMismatch",
      "msg": "top_agent account is not the canonical TopAgent PDA for its agent"
    },
    {
      "code": 6019,
      "name": "topAgentNotInChain",
      "msg": "top agent is not the inviter nor the inviter's direct upline"
    },
    {
      "code": 6020,
      "name": "topCommissionAccountMissing",
      "msg": "top_commission_account is required when top agent differs from inviter"
    }
  ],
  "types": [
    {
      "name": "commissionAccount",
      "docs": [
        "邀请人在某 settle_mint 下累计佣金账本（累计模式，inviter 主动 claim 一次清零）。",
        "PDA seeds: [\"commission\", inviter, settle_mint]"
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
            "name": "inviter",
            "docs": [
              "邀请人（agent）钱包。"
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
            "name": "totalUnclaimed",
            "docs": [
              "当前未提取的累计佣金（base units of settle_mint）。"
            ],
            "type": "u64"
          },
          {
            "name": "totalClaimed",
            "docs": [
              "历史累计已提取佣金（base units）。"
            ],
            "type": "u64"
          },
          {
            "name": "lastTime",
            "docs": [
              "最后变动时间（unix sec）。"
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
      "name": "commissionClaimed",
      "docs": [
        "邀请人提取累计佣金。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inviter",
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
            "name": "totalUnclaimedAfter",
            "type": "u64"
          },
          {
            "name": "totalClaimedAfter",
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
      "name": "initTreasuryConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "commonCommissionRate",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "topCommissionRate",
            "docs": [
              "保留字段，D9 不读（top agent 暂不做）；client 传 None 即用默认 50%。"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "platformTokenMint",
            "docs": [
              "保留字段，D9 不读（回购销毁暂不做）；client 传 Pubkey::default() 即可。"
            ],
            "type": "pubkey"
          },
          {
            "name": "deadAddress",
            "docs": [
              "保留字段，同上。"
            ],
            "type": "pubkey"
          },
          {
            "name": "perpCoreProgram",
            "docs": [
              "perp_core program ID（CPI guard）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "platformFeeAuthority",
            "type": "pubkey"
          },
          {
            "name": "tradeFeeAuthority",
            "type": "pubkey"
          },
          {
            "name": "toPlatformTradeFeePct",
            "docs": [
              "platform 分成比例（1e9 精度）；None → 20%。"
            ],
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "inviteRelation",
      "docs": [
        "邀请关系（一个 invitee 一个 inviter，单链）。",
        "PDA seeds: [\"invite\", invitee]"
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
            "name": "invitee",
            "docs": [
              "被邀请人（用户）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "inviter",
            "docs": [
              "邀请人（agent）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "docs": [
              "创建时间（unix sec）。"
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
      "name": "inviterBound",
      "docs": [
        "用户绑定邀请人成功。",
        "",
        "EVM 对应：`MarketAgent.addInviterRelation`。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "invitee",
            "type": "pubkey"
          },
          {
            "name": "inviter",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "setTokenTopAgent",
      "docs": [
        "admin 设置 / 取消某地址在某结算币下的\"顶级代理（top agent）\"资格。",
        "",
        "EVM 对应：`MarketAgent.setTokenTopAgent(token, agent, approval)`（字段逐一对齐，",
        "仅 `token`(address) → `settle_mint`(Pubkey)，并补 `timestamp`）。"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "settleMint",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "approval",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "splitTradeFeeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taker",
            "docs": [
              "taker 钱包（用于事件 + 反查 InviteRelation）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "feeTotal",
            "docs": [
              "本笔总手续费（base units of settle_mint）。"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "topAgent",
      "docs": [
        "顶级代理（top agent）白名单标记 —— 每个 (settle_mint, agent) 组合一个 PDA。",
        "",
        "对应 EVM `MarketAgent.topAgentTokens[token][agent] = bool`：EVM 用二维 mapping，",
        "Solana 无 map，故按 (settle_mint, agent) 组合键各开一个 PDA；`approved` 即 EVM 的 bool 值。",
        "PDA seeds: [\"top_agent\", settle_mint, agent]"
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
              "结算币 mint（对应 EVM 的 token 维度）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "agent",
            "docs": [
              "代理地址（对应 EVM 的 agent）。"
            ],
            "type": "pubkey"
          },
          {
            "name": "approved",
            "docs": [
              "是否被授予顶级代理资格（对应 EVM 的 approval）。"
            ],
            "type": "bool"
          },
          {
            "name": "updatedAt",
            "docs": [
              "最近一次设置时间（unix sec）。"
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
      "name": "tradeFeeSplit",
      "docs": [
        "perp_core CPI 进来分一笔交易费。",
        "",
        "字段对账 EVM `Perpetual.splitTradeFee` + `MarketAgent.addInviteRelationAndCalc`：",
        "- `inviter`：被绑定的邀请人；若 invitee 未绑定 → Pubkey::default()",
        "- `commission_to_inviter`：本笔进入 CommissionAccount 的金额（base units）",
        "- `top_agent`：顶级代理地址（情况A=inviter 自己 / 情况B=inviter 的上级）；无 top agent → Pubkey::default()",
        "- `commission_to_top_agent`：进入 top agent CommissionAccount 的金额（情况A 时并入 inviter 账户但本字段仍单独记额）",
        "- `to_platform`：转给 platform_fee 的金额（base units）",
        "- `to_trade_fee`：剩余转给 trade_fee 的金额（base units，原 EVM \"merge to buyback\" 路径）"
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
            "name": "feeTotal",
            "type": "u64"
          },
          {
            "name": "inviter",
            "type": "pubkey"
          },
          {
            "name": "commissionToInviter",
            "type": "u64"
          },
          {
            "name": "topAgent",
            "type": "pubkey"
          },
          {
            "name": "commissionToTopAgent",
            "type": "u64"
          },
          {
            "name": "toPlatform",
            "type": "u64"
          },
          {
            "name": "toTradeFee",
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
      "name": "treasuryConfigInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "platformTokenMint",
            "type": "pubkey"
          },
          {
            "name": "commonCommissionRate",
            "type": "u64"
          },
          {
            "name": "topCommissionRate",
            "type": "u64"
          },
          {
            "name": "perpCoreProgram",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "treasuryVaultInitialized",
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
    }
  ],
  "constants": [
    {
      "name": "seedCommission",
      "type": "bytes",
      "value": "[99, 111, 109, 109, 105, 115, 115, 105, 111, 110]"
    },
    {
      "name": "seedInvite",
      "type": "bytes",
      "value": "[105, 110, 118, 105, 116, 101]"
    },
    {
      "name": "seedTopAgent",
      "type": "bytes",
      "value": "[116, 111, 112, 95, 97, 103, 101, 110, 116]"
    },
    {
      "name": "seedTreasuryConfig",
      "type": "bytes",
      "value": "[116, 114, 101, 97, 115, 117, 114, 121, 95, 99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "seedTreasuryVaultAuth",
      "type": "bytes",
      "value": "[116, 114, 101, 97, 115, 117, 114, 121, 95, 118, 97, 117, 108, 116, 95, 97, 117, 116, 104]"
    },
    {
      "name": "seedTreasuryVaultToken",
      "type": "bytes",
      "value": "[116, 114, 101, 97, 115, 117, 114, 121, 95, 118, 97, 117, 108, 116, 95, 116, 111, 107, 101, 110]"
    }
  ]
};
