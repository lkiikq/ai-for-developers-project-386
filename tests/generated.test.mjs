// Тест цепочки генерации контракта (тикет #9).
//
// Ставки:
// 1) `mise run generate` создаёт оба артефакта с нуля — contract/openapi.yaml
//    и клиентский SDK (проверяем удалением файлов и регенерацией);
// 2) сверка генерируемых путей ловит НОВЫЙ файл — регрессия для `git add -A`
//    перед `git diff`: обычный git diff untracked-файлы не показывает.
//
// Тест работает с реальными git/mise из корня репозитория; состояние
// восстанавливается в finally: удалённые артефакты возвращаются из индекса,
// пробник удаляется из рабочей копии и индекса.
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const openapiPath = path.join(root, 'contract', 'openapi.yaml');
const generatedDir = path.join(root, 'client', 'src', 'api', 'generated');
const sdkEntryPath = path.join(generatedDir, 'index.ts');
const probePath = path.join(generatedDir, '__new_file__.gen.ts');
const probeSpec = 'client/src/api/generated/__new_file__.gen.ts';

const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
const output = (r) => {
  if (r.error) return String(r.error);
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
};

// Восстановление после падения: убрать пробник (в т.ч. из индекса, если
// сверка успела его добавить) и вернуть удалённые артефакты из индекса.
function restore() {
  rmSync(probePath, { force: true });
  run('git', ['reset', '-q', '--', probeSpec]);
  if (!existsSync(openapiPath)) {
    run('git', ['checkout', '--', 'contract/openapi.yaml']);
  }
  if (!existsSync(sdkEntryPath)) {
    run('git', ['checkout', '--', 'client/src/api/generated/index.ts']);
  }
}

test('mise run generate создаёт оба артефакта с нуля', () => {
  try {
    rmSync(openapiPath, { force: true });
    rmSync(sdkEntryPath, { force: true });

    const gen = run('mise', ['run', 'generate']);
    assert.equal(gen.status, 0, `mise run generate упал:\n${output(gen)}`);
    assert.ok(
      existsSync(openapiPath),
      'contract/openapi.yaml должен быть создан генерацией',
    );
    assert.ok(
      existsSync(sdkEntryPath),
      'client/src/api/generated/index.ts должен быть создан генерацией',
    );

    const verify = run('mise', ['run', 'verify:generated']);
    assert.equal(
      verify.status,
      0,
      `свежие артефакты не совпадают с git:\n${output(verify)}`,
    );
  } finally {
    restore();
  }
});

test('проверка генерации ловит новый файл в генерируемых путях', () => {
  try {
    writeFileSync(probePath, '// пробник: новый файл не должен проходить сверку\n');

    const dirty = run('mise', ['run', 'verify:generated']);
    assert.notEqual(
      dirty.status,
      0,
      'новый файл в генерируемых путях должен детектиться сверкой (git add -A перед git diff)',
    );

    rmSync(probePath, { force: true });
    const clean = run('mise', ['run', 'verify:generated']);
    assert.equal(
      clean.status,
      0,
      `после удаления пробника сверка должна быть зелёной:\n${output(clean)}`,
    );
  } finally {
    restore();
  }
});
