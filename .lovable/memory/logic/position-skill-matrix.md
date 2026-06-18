---
name: Position-based core skill matrix
description: positions table + position_core_skills with minimum_level and advanced_level per position
type: feature
---
- `positions` table: id, department_id, name, code, sort_order
- `position_core_skills` table: position_id, skill_id, minimum_level, advanced_level, weight, sort_order (UNIQUE on position_id+skill_id)
- `profiles.position_id` links staff to their position
- 30 positions seeded across 6 departments (KHDN, TCTH, DVKH, HTTD, PGD, BGD)
- 38 skills seeded into skill_catalog (4 groups)
- ConfigCoreSkillsPage: Department → Position → assign/edit core skills
- Profile, CoreSkillsByPosition, TeamOverview, Overview, Reports all read position_core_skills
