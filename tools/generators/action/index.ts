import {
  Tree,
  formatFiles,
  readProjectConfiguration,
  updateProjectConfiguration,
  generateFiles,
} from "@nrwl/devkit";
import { applicationGenerator } from "@nrwl/node";
import { ActionSchema } from "./schema";
import { join } from "path";

export default async function (tree: Tree, schema: ActionSchema) {
  await applicationGenerator(tree, { name: schema.name });

  const configuration = readProjectConfiguration(tree, schema.name);
  const src = `${configuration.root}/src`;

  // replace source files
  tree.delete(src);
  generateFiles(tree, join(__dirname, "files"), configuration.root, {
    ...schema,
    template: "",
  });

  // use ncc as builder
  const out = `dist/apps/${schema.name}`;
  delete configuration.targets["serve"];
  configuration.targets["build"] = {
    executor: "@nrwl/workspace:run-commands",
    options: {
      commands: [
        `ncc build ${src}/main.ts --out ${out} --minify`,
        `mkdir --parents ${out} && cp --update ${configuration.root}/action.yml ${out}/actions.yml`,
      ],
      outputPath: out,
    },
  };
  updateProjectConfiguration(tree, schema.name, configuration);

  // patch tsconfig.json
  const tsConfig = JSON.parse(tree.read(`${src}/tsconfig.json`, "utf8"));
  tsConfig["compilerOptions"]["rootDir"] = "../..";
  tree.write(`${src}/tsconfig.json`, tsConfig);

  await formatFiles(tree);
}
