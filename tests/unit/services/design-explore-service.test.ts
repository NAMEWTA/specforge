import { describe, it, expect } from 'vitest';
import { validateV0Draft } from '../../../src/services/design-explore-service.js';
import type { V0DraftCheckResult, V0DraftViolation } from '../../../src/services/design-explore-service.js';

/**
 * validateV0Draft 校验函数单元测试
 * 覆盖 5 类违例：body-too-long / decisions-out-of-range / risks-out-of-range /
 *               missing-confirm-reject / not-independent-message
 *
 * Validates: Req 11.6
 */
describe('validateV0Draft - 5 类违例覆盖', () => {
  // ============================================================
  // 辅助：构造合法 v0 草稿
  // ============================================================
  const validDraft = `## v0 草稿

### 核心架构假设
通过新增 3 份 services 承载扫描/巡检/沉淀三类职责，CLI 层仅做路由。

### 关键决策
1. 选型使用 TypeScript strict 模式
2. 采用三层渐进披露架构
3. CLI 路由与业务逻辑分离

### 主要风险
1. 模板渲染性能可能不足，缓解：预编译模板
2. 多平台兼容性风险，缓解：抽象适配层

---
- [ ] confirm
- [ ] reject
`;

  // ============================================================
  // 分支一：合法 v0 草稿（所有约束满足）
  // ============================================================
  describe('合法 v0 草稿', () => {
    it('所有约束满足 → valid=true, violations 为空', () => {
      const result: V0DraftCheckResult = validateV0Draft(validDraft);

      expect(result.valid).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('恰好 5 条关键决策仍合法', () => {
      const draft = `## v0 草稿

### 核心架构假设
采用事件驱动架构。

### 关键决策
1. 决策一
2. 决策二
3. 决策三
4. 决策四
5. 决策五

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案
3. 风险三，缓解方案

---
- [ ] confirm
- [ ] reject
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('恰好 3 条关键决策 + 2 条风险（下界）仍合法', () => {
      const draft = `## v0 草稿

### 核心架构假设
微服务边界划分。

### 关键决策
1. 决策一
2. 决策二
3. 决策三

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案

---
- [ ] confirm
- [ ] reject
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  // ============================================================
  // 分支二：正文超过 500 字（body-too-long）
  // ============================================================
  describe('body-too-long', () => {
    it('正文超过 500 字（不含标题与列表编号）→ violations 含 body-too-long', () => {
      // 构造超长正文：每个决策和风险描述都很长
      const longText = '这是一段很长的描述文字用于测试'.repeat(50); // 远超 500 字
      const draft = `## v0 草稿

### 核心架构假设
${longText}

### 关键决策
1. 决策一
2. 决策二
3. 决策三

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案

---
- [ ] confirm
- [ ] reject
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('body-too-long' as V0DraftViolation);
    });
  });

  // ============================================================
  // 分支三：关键决策数量不在 3-5 范围（decisions-out-of-range）
  // ============================================================
  describe('decisions-out-of-range', () => {
    it('关键决策少于 3 条（2 条）→ violations 含 decisions-out-of-range', () => {
      const draft = `## v0 草稿

### 核心架构假设
采用分层架构。

### 关键决策
1. 决策一
2. 决策二

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案

---
- [ ] confirm
- [ ] reject
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('decisions-out-of-range' as V0DraftViolation);
    });

    it('关键决策超过 5 条（6 条）→ violations 含 decisions-out-of-range', () => {
      const draft = `## v0 草稿

### 核心架构假设
采用分层架构。

### 关键决策
1. 决策一
2. 决策二
3. 决策三
4. 决策四
5. 决策五
6. 决策六

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案

---
- [ ] confirm
- [ ] reject
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('decisions-out-of-range' as V0DraftViolation);
    });
  });

  // ============================================================
  // 分支四：主要风险数量不在 2-3 范围（risks-out-of-range）
  // ============================================================
  describe('risks-out-of-range', () => {
    it('主要风险少于 2 条（1 条）→ violations 含 risks-out-of-range', () => {
      const draft = `## v0 草稿

### 核心架构假设
采用分层架构。

### 关键决策
1. 决策一
2. 决策二
3. 决策三

### 主要风险
1. 风险一，缓解方案

---
- [ ] confirm
- [ ] reject
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('risks-out-of-range' as V0DraftViolation);
    });

    it('主要风险超过 3 条（4 条）→ violations 含 risks-out-of-range', () => {
      const draft = `## v0 草稿

### 核心架构假设
采用分层架构。

### 关键决策
1. 决策一
2. 决策二
3. 决策三

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案
3. 风险三，缓解方案
4. 风险四，缓解方案

---
- [ ] confirm
- [ ] reject
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('risks-out-of-range' as V0DraftViolation);
    });
  });

  // ============================================================
  // 分支五：缺少 confirm / reject 选项（missing-confirm-reject）
  // ============================================================
  describe('missing-confirm-reject', () => {
    it('缺少 confirm 选项 → violations 含 missing-confirm-reject', () => {
      const draft = `## v0 草稿

### 核心架构假设
采用分层架构。

### 关键决策
1. 决策一
2. 决策二
3. 决策三

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案

---
- [ ] reject
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('missing-confirm-reject' as V0DraftViolation);
    });

    it('缺少 reject 选项 → violations 含 missing-confirm-reject', () => {
      const draft = `## v0 草稿

### 核心架构假设
采用分层架构。

### 关键决策
1. 决策一
2. 决策二
3. 决策三

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案

---
- [ ] confirm
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('missing-confirm-reject' as V0DraftViolation);
    });
  });

  // ============================================================
  // 分支六：不是独立消息（not-independent-message）
  // ============================================================
  describe('not-independent-message', () => {
    it('包含其他 Step 内容（Step 4 详细设计）→ violations 含 not-independent-message', () => {
      const draft = `## v0 草稿

### 核心架构假设
采用分层架构。

### 关键决策
1. 决策一
2. 决策二
3. 决策三

### 主要风险
1. 风险一，缓解方案
2. 风险二，缓解方案

---
- [ ] confirm
- [ ] reject

## Step 4 详细 DESIGN

这里是详细设计内容，不应与 v0 草稿合并在同一消息中。
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('not-independent-message' as V0DraftViolation);
    });
  });

  // ============================================================
  // 分支七：多重违例同时报告
  // ============================================================
  describe('多重违例', () => {
    it('同时触发多个违例 → violations 包含所有违例', () => {
      // 构造：正文超长 + 决策仅 1 条 + 风险 4 条 + 缺 confirm/reject + 含 Step 4
      const longText = '超长正文内容用于触发字数限制校验'.repeat(50);
      const draft = `## v0 草稿

### 核心架构假设
${longText}

### 关键决策
1. 唯一一条决策

### 主要风险
1. 风险一
2. 风险二
3. 风险三
4. 风险四

## Step 4 详细 DESIGN

详细设计内容。
`;
      const result: V0DraftCheckResult = validateV0Draft(draft);

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('body-too-long' as V0DraftViolation);
      expect(result.violations).toContain('decisions-out-of-range' as V0DraftViolation);
      expect(result.violations).toContain('risks-out-of-range' as V0DraftViolation);
      expect(result.violations).toContain('missing-confirm-reject' as V0DraftViolation);
      expect(result.violations).toContain('not-independent-message' as V0DraftViolation);
    });
  });
});
