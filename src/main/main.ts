import path from 'node:path';

import fs from 'fs-extra';
import inquirer from 'inquirer';

import {
  FOLDER_NAME_EXISTS_MESSAGE,
  FOLDER_NAME_INVALID_MESSAGE,
  FOLDER_NAME_REQUIRED_MESSAGE,
  PACKAGE_NAME_PATTERN,
  SUBPACKAGE_DIRS,
  TEMPLATE_DIR,
  assertValidFolderName,
  normalizeFolderName,
  readJsonObject,
  resolveSubpackageBaseName,
  updatePackageDependencies,
  writeJsonObject,
} from './main.config';
import type {
  CreateMonorepoResult,
  FolderNameAnswers,
  ProgressReporter,
} from './main.type';

/** 询问项目目录名。校验规则和提示文案复用 config 里的那份。 */
async function promptFolderName(): Promise<string> {
  const answers = (await inquirer.prompt([
    {
      type: 'input',
      name: 'folderName',
      message: 'Please enter the project folder name:',
      default: 'my-monorepo-project',
      validate: (input: string) => {
        if (!input || !input.trim()) {
          return FOLDER_NAME_REQUIRED_MESSAGE;
        }

        const candidate = normalizeFolderName(input);

        if (!PACKAGE_NAME_PATTERN.test(candidate)) {
          return FOLDER_NAME_INVALID_MESSAGE;
        }

        if (fs.existsSync(path.join(process.cwd(), candidate))) {
          return FOLDER_NAME_EXISTS_MESSAGE;
        }

        return true;
      },
      // filter 在 validate 之后执行，所以这里只在未配置默认值兜底。
      filter: (input: string) => (input ? normalizeFolderName(input) : ''),
    },
  ])) as FolderNameAnswers;

  return answers.folderName;
}

/**
 * 独占创建目标目录。
 * 目录已存在时直接失败，避免覆盖用户已有文件。
 */
async function createTargetDirectory(folderName: string): Promise<string> {
  const targetDir = path.join(process.cwd(), folderName);

  try {
    await fs.mkdir(targetDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`The directory "${folderName}" already exists.`);
    }

    throw error;
  }

  return targetDir;
}

/** 改写根 package.json 的包名。 */
async function updateRootPackageName(
  targetDir: string,
  packageName: string,
): Promise<void> {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const rootPackageJson = await readJsonObject(packageJsonPath);

  if (!rootPackageJson) {
    return;
  }

  rootPackageJson.name = packageName;
  await writeJsonObject(packageJsonPath, rootPackageJson);
}

/** 遍历 apps/ 与 packages/，改写每个子包的包名和依赖引用。 */
async function updateSubpackages(
  rootDir: string,
  packageName: string,
): Promise<void> {
  for (const dir of SUBPACKAGE_DIRS) {
    const subpackagesPath = path.join(rootDir, dir);

    if (!(await fs.pathExists(subpackagesPath))) {
      continue;
    }

    const entries = await fs.readdir(subpackagesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageJsonPath = path.join(
        subpackagesPath,
        entry.name,
        'package.json',
      );
      const packageJson = await readJsonObject(packageJsonPath);

      if (!packageJson) {
        continue;
      }

      const baseName = resolveSubpackageBaseName(packageJson, entry.name);

      if (!baseName) {
        continue;
      }

      packageJson.name = `@${packageName}/${baseName.toLowerCase()}`;

      updatePackageDependencies(packageJson, packageName);

      await writeJsonObject(packageJsonPath, packageJson);
    }
  }
}

/** 生成 Monorepo 骨架：交互取目录名，拷贝模板，再把包名改写成用户的项目名。 */
export async function createMonorepo(
  report: ProgressReporter,
): Promise<CreateMonorepoResult> {
  const folderName = await promptFolderName();
  assertValidFolderName(folderName);

  report(`Creating project: ${folderName}`);

  const targetDir = await createTargetDirectory(folderName);

  report('Copying template files...');
  await fs.copy(TEMPLATE_DIR, targetDir);

  report('Updating root package.json...');
  await updateRootPackageName(targetDir, folderName);

  report('Updating workspace package names...');
  await updateSubpackages(targetDir, folderName);

  return { folderName, packageName: folderName, targetDir };
}
