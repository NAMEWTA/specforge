---
name: auth-patterns
type: security-rule
description: >-
  认证与授权模式——身份验证方式选择、令牌设计、会话管理、权限模型、常见漏洞规避。当设计登录、API 鉴权、多租户隔离、权限控制时触发。
  触发词：认证、鉴权、authentication、authorization、JWT、OAuth、RBAC、ABAC、session、token、登录、权限。
version: '1.0.0'
author: 'specforge'
---

# 认证与授权模式

## Iron Law

> **认证（Authentication）回答「你是谁」；授权（Authorization）回答「你能做什么」。** 混淆二者是大多数权限漏洞的根源。每个受保护资源都必须**同时**明确这两件事。

## 决策地图

### 选择认证方式

| 场景                                | 推荐                                           |
| ----------------------------------- | ---------------------------------------------- |
| 传统 Web 应用 + 浏览器              | Session + HttpOnly Cookie + CSRF 保护          |
| SPA + 独立 API                      | OAuth 2.1 + PKCE + short-lived access token    |
| 服务间通信（内部）                  | mTLS 或 JWT（短生命周期）+ SPIFFE/workload ID  |
| 第三方开放平台                      | OAuth 2.1 授权码流程                           |
| IoT / 设备                          | Device Code Flow / X.509 证书                  |
| CLI 工具                            | Device Code Flow / personal access token       |

**铁律**：2024 年后的新系统，**默认选 OAuth 2.1**（合并 OAuth 2.0 + PKCE + 隐式流程弃用）。不要再设计自己的认证协议。

### 选择授权模型

| 场景                                    | 推荐模型           |
| --------------------------------------- | ------------------ |
| 角色固定、粒度粗                        | RBAC（角色-权限） |
| 权限粒度细、基于属性（部门、时间、IP）  | ABAC               |
| 资源-所有者-权限的组合矩阵              | ReBAC（如 Google Zanzibar） |
| 企业内集中管理策略                      | 外部策略引擎 OPA / Cedar   |

## 令牌设计

### JWT 的常见陷阱

- **不要把敏感信息放进 payload**：JWT 只是 base64url 编码，非加密。
- **明确 `alg`**：拒绝 `none`；固定允许的算法列表（如 `RS256` / `EdDSA`）。
- **短生命周期**：access token 5-15 分钟；refresh token 单独存储、可撤销。
- **包含必要 claim**：`iss`、`aud`、`exp`、`nbf`、`iat`、`jti`、`sub`。
- **校验全集**：签名 + 过期 + 签发者 + 受众 + 撤销名单。

### Opaque Token vs JWT

| 维度         | Opaque Token（不透明）       | JWT（自包含）                |
| ------------ | ---------------------------- | ---------------------------- |
| 撤销         | 服务器端查询即可             | 需黑名单 / 短生命周期        |
| 性能         | 每次请求需查库               | 无状态验证                   |
| 信息携带     | 不可携带，需反查             | 携带 claim                   |
| 适用         | 高撤销需求、细粒度控制       | 微服务 / 无状态 API          |

**实用策略**：入口层使用 opaque token + 内部转 JWT（Token Exchange）。

## 会话管理

- **Cookie 属性**：`Secure` + `HttpOnly` + `SameSite=Lax|Strict`。
- **CSRF 保护**：SameSite 已大幅缓解，但跨站表单仍需 CSRF Token。
- **会话固化**：登录成功后**重新生成 sessionId**，避免会话劫持。
- **空闲超时** + **绝对超时**双重保障。
- **多设备登录**：显式管理活跃会话列表 + 强制下线能力。
- **登出必须销毁服务端会话**，不能只清 cookie。

## 密码与凭证

- **密码存储**：`argon2id`（默认） / `bcrypt`（替代） / `scrypt`。**禁止** MD5/SHA-1/SHA-256 直接哈希。
- **密码强度**：参考 NIST SP 800-63B，不强制复杂度规则，强调长度（≥ 12 字符）与黑名单比对。
- **凭证填充（Credential Stuffing）防护**：订阅 HIBP Pwned Passwords；登录失败速率限制 + CAPTCHA 升级。
- **存在性查询攻击**：登录失败提示应**不区分**「用户不存在」与「密码错误」。

## 多因素认证（MFA）

| 因素           | 强度   | 适用              |
| -------------- | ------ | ----------------- |
| TOTP（Authenticator App） | 中     | 默认推荐          |
| WebAuthn / Passkey | 高     | 强烈推荐的新标准  |
| SMS 短信        | 低     | 已不推荐（可被 SIM 交换） |
| 硬件密钥 (U2F) | 高     | 高敏感账户        |
| 邮件验证码      | 低     | 备用渠道          |

**2025 方向**：Passkey（WebAuthn）正在替代密码 + TOTP 成为新默认。

## 权限模型实现

### RBAC 模型

```
User ── has ──> Role ── grants ──> Permission ── applies to ──> Resource
```

- 角色代表**职责包**（admin / editor / viewer）。
- 权限用 `<resource>:<action>` 表达，如 `order:read` / `order:refund`。

### ABAC 扩展

```
allow = subject.department == resource.department
     && subject.clearance >= resource.sensitivity
     && env.time in resource.allowedWindow
```

用策略引擎（OPA、Cedar）表达，避免硬编码条件散落代码各处。

### ReBAC（关系授权）

- 适合团队空间 / 多租户 / 共享文档场景。
- 使用 Google Zanzibar 模式：`(object, relation, subject)` 三元组存储。
- 开源实现：OpenFGA、SpiceDB、Keto。

## 常见漏洞对照（OWASP Top 10 相关）

| 漏洞                              | 防护要点                                  |
| --------------------------------- | ----------------------------------------- |
| **A01 Broken Access Control**      | 每个 endpoint 强制鉴权；禁止基于前端隐藏 |
| **A02 Cryptographic Failures**     | TLS 必备；密码存储用 argon2id            |
| **A07 Identification/Auth Failures** | 登录限速、MFA、会话固化、密码策略        |
| **IDOR（不安全直接对象引用）**     | 所有查询带 owner/tenant 过滤              |
| **JWT 算法混淆**                   | 固定允许 alg；不信任 `alg: none`          |
| **SSRF 从 callback URL 开始**      | 白名单 redirect_uri                       |
| **Timing Attack on 密码/令牌比较** | 使用常量时间比较函数                      |
| **越权接口（forceful browsing）**  | 资源级权限 + 默认拒绝                     |

## 多租户隔离

- **每个查询强制带 `tenant_id`**：通过基类 / 拦截器注入，避免忘记。
- **横向越权测试**：租户 A 的 token 访问租户 B 的资源必须 403。
- **日志带 tenant 上下文**：便于审计。
- **加密密钥隔离**（高敏感场景）：每个租户独立 KEK / DEK。

## 多语言落地参考

| 能力               | Java (Spring)                     | Python                         | Go                            | Node.js                       |
| ------------------ | --------------------------------- | ------------------------------ | ----------------------------- | ----------------------------- |
| 认证框架           | Spring Security                   | Authlib / FastAPI-Users        | `go-oauth2/oauth2`            | Passport / NextAuth           |
| JWT                | `java-jwt` / `nimbus-jose-jwt`    | `pyjwt` / `python-jose`        | `golang-jwt/jwt`              | `jose` / `jsonwebtoken`       |
| 密码哈希           | Spring BCrypt / Argon2            | `argon2-cffi` / `passlib`      | `argon2` / `bcrypt`           | `@node-rs/argon2` / `bcrypt`  |
| OAuth 客户端       | Spring OAuth Client               | Authlib                        | `golang.org/x/oauth2`         | `openid-client` / `oidc-client-ts` |
| 策略引擎           | OPA（gRPC/HTTP）                   | OPA                            | OPA                           | OPA                           |
| ReBAC              | OpenFGA SDK                       | OpenFGA SDK                    | OpenFGA SDK                   | OpenFGA SDK                   |
| WebAuthn           | Yubico java-webauthn-server       | `py_webauthn`                  | `go-webauthn`                 | `@simplewebauthn/server`      |

## 自检清单

- [ ] 每个受保护 endpoint 同时执行认证与授权检查。
- [ ] 密码使用 argon2id / bcrypt 存储，含 salt。
- [ ] Token 生命周期 + 撤销机制明确；JWT 限制 alg 白名单。
- [ ] MFA 至少支持 TOTP 或 Passkey；关键操作强制 MFA。
- [ ] 所有数据查询强制多租户 / 所有者过滤。
- [ ] 登录接口带速率限制与异常检测；失败响应不泄漏用户存在性。
- [ ] 会话登录后重新生成 ID；登出销毁服务端会话。
- [ ] 权限模型在代码中以策略形式集中表达，而非散落 `if` 判断。
- [ ] 关键鉴权路径有单元 + 集成测试；越权 / 旁路被明确覆盖。
