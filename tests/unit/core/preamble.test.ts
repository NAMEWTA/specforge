import { describe, it, expect } from 'vitest';
import { parsePreamble } from '../../../src/core/preamble.js';

describe('parsePreamble', () => {
  it('提取 bash preamble 中的命令列表', () => {
    const content = `---
name: design-explore
type: workflow-command
description: test
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
specforge list --skills --triggers=architecture,design --format=json
specforge status --phase=design --check-requires
specforge doctor --check-deps --quiet
-->

# 正文开始
`;
    const commands = parsePreamble(content);
    expect(commands).toHaveLength(3);
    expect(commands[0]).toBe('specforge list --skills --triggers=architecture,design --format=json');
    expect(commands[1]).toBe('specforge status --phase=design --check-requires');
  });

  it('无 preamble 时返回空数组', () => {
    const content = `---
name: test
type: domain-rule
description: test
version: "1.0.0"
author: "wta"
---

# 正文
`;
    const commands = parsePreamble(content);
    expect(commands).toEqual([]);
  });

  it('preamble 中有空行时正确过滤', () => {
    const content = `---
name: test
type: workflow-command
description: test
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash

specforge doctor --check-node

specforge list --skills --format=json

-->

# 正文
`;
    const commands = parsePreamble(content);
    expect(commands).toHaveLength(2);
  });
});
