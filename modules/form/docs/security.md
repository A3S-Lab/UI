# A3S Form 安全边界

## 信任模型

`FormDocument`、`FormPatch`、表单值、远程选项和异步校验响应均视为不可信输入。A3S Form 负责有界解析、确定性编译和字段级校验；宿主负责身份、授权、租户隔离、持久化、密钥、网络访问和副作用。

## 已实施的约束

- 编译器限制序列化大小、节点数、深度、规则数、表达式操作数和补丁操作数。
- 拒绝重复节点 ID、悬空引用、循环 UI 树、循环规则依赖和不支持的能力。
- 表达式使用闭合的纯操作集合，不调用 `eval`，也不加载文档指定的远程代码。
- `FormPatch` 必须匹配当前 revision，并在克隆文档上完整校验后原子提交；失败不会留下部分修改。
- canonical SHA-256 digest 覆盖可发布文档，`verifyPinnedForm` 同时校验 revision 与 digest。
- 数据源请求可取消，动作只通过宿主回调执行，文档本身不包含凭据。
- 异步校验请求可取消，迟到响应不会写入新值；宿主问题映射为稳定的 `async.<code>`，无效响应与上游异常均闭合失败。
- Renderer 默认不持久化、不自动提交到网络，也不绕过宿主提供的错误和只读状态。

## 宿主必须承担的责任

1. 只注册经过审核且版本可追踪的 widget、data source 和 action。
2. 在每个数据源/动作入口重新执行身份、租户和资源权限校验，不能信任前端传入的上下文。
3. 对提交值执行服务端 schema/digest 和业务规则复验；客户端异步校验只用于交互反馈。
4. 不把 token、密码、连接串或其他密钥写入 FormDocument、FormPlan、FormPatch、表单值或诊断信息。
5. 对持久化交互记录 actor、时间、run/node ID、固定 form digest 和审核结果。

## Coding Agent

Coding Agent 通过 `$a3s-form` Skill 和 JSON CLI 工作。推荐流程是 `validate -> diff/patch -> validate -> 人工或宿主批准`。Agent 不应获得生产动作 registry 的直接凭据，也不应把浏览器自动化当作修改表单定义的权威通道。

## 报告问题

安全问题请通过仓库所有者认可的私密渠道报告；不要在公开 Issue 中附带凭据、租户数据或可利用的生产细节。
