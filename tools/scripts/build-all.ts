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

    sh.exec(`git clone -b ${MAJOR_VERSION} --depth 1 --config core.longpaths=true https://github.com/DevExpress/devextreme-documentation.git ${DOCUMENTATION_TEMP_DIR}`);

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

sh.exec('pnpm run all:pack-and-copy');

// ===============================================================
// 📦 СБОРКА ФРЕЙМВОРК-ПАКЕТОВ (nx pack создаёт npm/ папки)
// ===============================================================
sh.exec('pnpx nx pack devextreme-react --skipNxCache', { silent: true });
sh.exec('pnpx nx pack devextreme-vue --skipNxCache', { silent: true });
sh.exec(`pnpx nx pack devextreme-angular${devMode ? '' : ' --with-descriptions'} --skipNxCache`, { silent: true });

// ===============================================================
// 🔧 ПОДМЕНА ПОСЛЕ nx pack — ГАРАНТИРОВАННО В ФИНАЛЬНЫХ АРТЕФАКТАХ
// ===============================================================

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

// --- 1. devextreme ---
const devextremeNpmPath = path.join(DEVEXTREME_NPM_DIR, 'devextreme');
sh.exec(`pnpm pkg set name="${SCOPE}/devextreme"`, { cwd: devextremeNpmPath });
console.log(`✅ Renamed devextreme → ${SCOPE}/devextreme`);

// --- 2. devextreme-react ---
const updatePackageJson = (pkgPath: string, newName: string) => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    // Имя
    pkg.name = newName;

    // Peer dependencies: полностью пересоздаём без 'devextreme'
    const newPeerDeps: Record<string, string> = {};
    for (const [key, value] of Object.entries(pkg.peerDependencies || {})) {
        if (key !== 'devextreme') {
            newPeerDeps[key] = value as string;
        }
    }
    newPeerDeps[`${SCOPE}/devextreme`] = devextremeNpmVersion;
    pkg.peerDependencies = newPeerDeps;

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
};

const reactNpmPath = path.join(ROOT_DIR, 'packages', 'devextreme-react', 'npm');
const reactPkgPath = path.join(reactNpmPath, 'package.json');
updatePackageJson(reactPkgPath, `${SCOPE}/devextreme-react`);
replaceInFiles(reactNpmPath, "from 'devextreme/", `from '${SCOPE}/devextreme/`);
console.log(`✅ Updated ${SCOPE}/devextreme-react`);

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

// Копируем уже подменённые .tgz
safeCopyTgz(path.join(ROOT_DIR, 'packages', 'devextreme-react', 'npm', '*.tgz'), NPM_DIR);
safeCopyTgz(path.join(ROOT_DIR, 'packages', 'devextreme-vue', 'npm', '*.tgz'), NPM_DIR);

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