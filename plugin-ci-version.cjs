module.exports = {
  name: `plugin-ci-version`,
  factory: (require) => {
    const { BaseCommand, WorkspaceRequiredError } = require(`@yarnpkg/cli`);
    const { Cache, Configuration, Project } = require(`@yarnpkg/core`);
    const semver = require("semver");
    const { Option } = require(`clipanion`);

    class CiVersion extends BaseCommand {
      static paths = [[`ci-version`]];

      strategy = Option.String();

      async execute() {
        const configuration = await Configuration.find(
          this.context.cwd,
          this.context.plugins,
        );
        const { project, workspace } = await Project.find(
          configuration,
          this.context.cwd,
        );
        const cache = await Cache.find(configuration);

        if (!workspace)
          throw new WorkspaceRequiredError(project.cwd, this.context.cwd);

        const valid = semver.valid(this.strategy);
        if (!valid)
          throw new Error(`should be a valid semver: ${this.strategy}`);

        const currentVersion = workspace.manifest.version;
        if (currentVersion === this.strategy) {
          this.context.stdout.write(
            `workspace ${workspace.manifest.raw.name} already has specified version ${this.strategy}\n`,
          );
          return;
        }

        workspace.manifest.version = this.strategy;

        this.context.stdout.write(
          `updating workspace ${workspace.manifest.raw.name} from ${currentVersion} to ${this.strategy}\n`,
        );

        return await project.installWithNewReport(
          {
            json: this.json,
            stdout: this.context.stdout,
          },
          {
            cache,
          },
        );
      }
    }

    return {
      commands: [CiVersion],
    };
  },
};
