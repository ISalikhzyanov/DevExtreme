import sh from 'shelljs';
import path from 'node:path';
import fs from 'node:fs';
import yargs from 'yargs';
import { ARTIFACTS_DIR, INTERNAL_TOOLS_ARTIFACTS, ROOT_DIR, NPM_DIR, JS_ARTIFACTS, CSS_ARTIFACTS } from './common/paths';
import { version as devextremeNpmVersion } from '../../packages/devextreme/package.json';

const argv = yargs
    .option('dev', { type: 'boolean', default: false })
    .parseSync();

const devMode = argv.dev;
const SCOPE = '@ISalikhzyanov';

console.log(`Dev mode: ${devMode}`);
console.log(`DevExtreme version: ${devextremeNpmVersion}`);
console.log(`Publishing under scope: ${SCOPE}`);

const DEVEXTREME_NPM_DIR = path.join(ROOT_DIR, 'packages/devextreme/artifacts/npm');

const injectDescriptions = () => {
    sh.pushd(ROOT_DIR);

    const monorepoVersion = sh.exec('pnpm pkg get version', { silent: true }).stdout.replaceAll('"', '');
    const MAJOR_VERSION = monorepoVersion.split('.').slice(0, 2).join('_');
    const DOCUMENTATION_TEMP_DIR = path.join(ARTIFACTS_DIR, 'doc_tmp');

    sh.exec(`git clone -b ${MAJOR_VERSION} --depth 1 --config core.longpaths=true https://github.com/DevExpress/devextreme-documentation.git     ${DOCUMENTATION_TEMP_DIR}`);

    sh.pushd(DOCUMENTATION_TEMP_DIR);
    sh.exec('npm i');
    sh.exec(`npm run update-topics -- --artifacts ${INTERNAL_TOOLS_ARTIFACTS}`);
    sh.popd();

    sh.rm('-rf', DOCUMENTATION_TEMP_DIR);
    sh.exec('pnpm run devextreme:inject-descriptions');
    sh.popd();
};

sh.set('-e');
sh.mkdir('-p', NPM_DIR);

const packAndCopy = (outputDir: string) => {
    sh.exec('pnpm pack', { silent: true });
    sh.cp('*.tgz', outputDir);
};

sh.cd(ROOT_DIR);

if (!devMode) {
    sh.exec(`pnpx nx run devextreme-metadata:make-aspnet-metadata`);
    injectDescriptions();
}

if (devMode) {
    sh.exec('pnpx nx build devextreme');
} else {
    sh.exec('pnpx nx build devextreme-scss');
    sh.exec('pnpx nx build-dist devextreme --skipNxCache', {
        env: {
            ...sh.env,
            BUILD_INTERNAL_PACKAGE: 'false'
        }
    });
}

sh.exec(`pnpx nx build devextreme-themebuilder${devMode ? '' : ' --skipNxCache'}`);

// Copy artifacts
sh.pushd(path.join(ROOT_DIR, 'packages/devextreme/artifacts'));
sh.cp('-r', ['ts', 'js', 'css'], ARTIFACTS_DIR);
sh.popd();

const BOOTSTRAP_DIR = path.join(ROOT_DIR, 'packages', 'devextreme-themebuilder', 'node_modules', 'bootstrap', 'dist');
sh.cp([path.join(BOOTSTRAP_DIR, 'js', 'bootstrap.js'), path.join(BOOTSTRAP_DIR, 'js', 'bootstrap.min.js')], JS_ARTIFACTS);
sh.cp([path.join(BOOTSTRAP_DIR, 'css', 'bootstrap.css'), path.join(BOOTSTRAP_DIR, 'css', 'bootstrap.min.css')], CSS_ARTIFACTS);

// ===============================================================
// 🔧 devextreme-react: изменяем ИСХОДНЫЙ package.json перед упаковкой
// ===============================================================

const reactSrcPath = path.join(ROOT_DIR, 'packages', 'devextreme-react');
const reactSrcPkgPath = path.join(reactSrcPath, 'package.json');

// Сохраняем оригинал
const originalPkgContent = fs.readFileSync(reactSrcPkgPath, 'utf8');
let restored = false;

try {
    const pkg = JSON.parse(originalPkgContent);

    // Обновляем имя
    pkg.name = `${SCOPE}/devextreme-react`;

    // Обновляем peerDependencies
    const newPeerDeps: Record<string, string> = {};
    for (const [key, value] of Object.entries(pkg.peerDependencies || {})) {
        if (key !== 'devextreme') {
            newPeerDeps[key] = value as string;
        }
    }
    newPeerDeps[`${SCOPE}/devextreme`] = devextremeNpmVersion;
    pkg.peerDependencies = newPeerDeps;

    // Записываем изменённый package.json
    fs.writeFileSync(reactSrcPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('✅ Updated source package.json for devextreme-react');

    // Запускаем nx pack — теперь он использует обновлённый package.json
    sh.exec('pnpx nx pack devextreme-react --skipNxCache', { silent: true });

    // Заменяем импорты в сгенерированной npm/ папке
    const reactNpmPath = path.join(reactSrcPath, 'npm');
    const replaceInFiles = (dir: string, from: string, to: string) => {
        const files = sh.find(dir).filter(file =>
            file.endsWith('.js') || file.endsWith('.d.ts')
        );
        files.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes(from)) {
                fs.writeFileSync(file, content.replaceAll(from, to), 'utf8');
            }
        });
    };

    replaceInFiles(reactNpmPath, "from 'devextreme/", `from '${SCOPE}/devextreme/`);
    console.log(`✅ Updated imports in ${SCOPE}/devextreme-react`);

    // Восстанавливаем оригинал
    fs.writeFileSync(reactSrcPkgPath, originalPkgContent, 'utf8');
    restored = true;
    console.log('✅ Restored original package.json');

} finally {
    // На случай ошибки — всё равно восстанавливаем
    if (!restored) {
        fs.writeFileSync(reactSrcPkgPath, originalPkgContent, 'utf8');
        console.log('⚠️ Restored package.json after error');
    }
}

// ===============================================================
// 📦 devextreme: rename package
// ===============================================================

const devextremeNpmPath = path.join(DEVEXTREME_NPM_DIR, 'devextreme');
sh.exec(`pnpm pkg set name="${SCOPE}/devextreme"`, { cwd: devextremeNpmPath });
console.log(`✅ Renamed devextreme → ${SCOPE}/devextreme`);

// ===============================================================
// 📤 КОПИРОВАНИЕ .tgz В ФИНАЛЬНУЮ ПАПКУ
// ===============================================================

sh.pushd(path.join(DEVEXTREME_NPM_DIR, 'devextreme'));
packAndCopy(NPM_DIR);
sh.popd();

sh.pushd(path.join(DEVEXTREME_NPM_DIR, 'devextreme-dist'));
packAndCopy(NPM_DIR);
sh.popd();

sh.pushd(path.join(ROOT_DIR, 'packages', 'devextreme-themebuilder', 'dist'));
sh.exec(`pnpm pkg set version="${devextremeNpmVersion}"`);
packAndCopy(NPM_DIR);
sh.popd();

const safeCopyTgz = (srcPattern: string, destDir: string) => {
    const files = sh.ls(srcPattern);
    if (files.code === 0 && files.length > 0) {
        sh.cp(srcPattern, destDir);
        console.log(`✅ Copied: ${path.basename(files[0])}`);
    } else {
        console.warn(`⚠️  No files matched: ${srcPattern}`);
    }
};

// Копируем только devextreme-react
safeCopyTgz(path.join(ROOT_DIR, 'packages', 'devextreme-react', 'npm', '*.tgz'), NPM_DIR);

// Internal (если нужно)
if (sh.env.BUILD_INTERNAL_PACKAGE === 'true') {
    sh.exec('pnpx nx build-dist devextreme');

    sh.pushd(path.join(DEVEXTREME_NPM_DIR, 'devextreme-internal'));
    sh.exec(`pnpm pkg set name="${SCOPE}/devextreme-internal"`);
    packAndCopy(NPM_DIR);
    sh.popd();

    sh.pushd(path.join(DEVEXTREME_NPM_DIR, 'devextreme-dist-internal'));
    packAndCopy(NPM_DIR);
    sh.popd();
}

console.log(`\n✅ Сборка завершена. Все пакеты обновлены под scope: ${SCOPE}`);
console.log(`Папка с готовыми .tgz: ${NPM_DIR}`);