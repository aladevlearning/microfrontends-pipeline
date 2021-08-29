const AWS = require("aws-sdk");
const codePipeline = new AWS.CodePipeline()
const { CodePipelineClient, StartPipelineExecutionCommand} = require("@aws-sdk/client-codepipeline");

const client = new CodePipelineClient({
    region: "eu-west-1"
});

exports.handler = async (event) => {
    const modifiedFolder = findFolder( event["commits"][0]);

    if (!modifiedFolder) {
        return {
            statusCode: 404,
            body: JSON.stringify('Folder cannot be found'),
        };
    }

    const pipelineName = modifiedFolder;

    console.log("Modified folder: ", modifiedFolder);
    console.log("Pipeline to be triggered: ", pipelineName);

    var params = {
      name: pipelineName
    };

    const command = new StartPipelineExecutionCommand(params);

    try {
      const data = await client.send(command);
      // process data.
      console.log("Code pipeline triggered: ", data);

      return {
             statusCode: 200,
             body: JSON.stringify('Code pipeline triggered: ' + pipelineName),
      };
    } catch (error) {
      // error handling.
      console.log(error);
    } finally {
      // finally.
    }

    return {
       statusCode: 500,
       body: JSON.stringify('Error during lambda'),
    };
};

function findFolder(latestCommit) {
    const modifiedFiles = findFolderBasedOnCommitType(latestCommit, "modified");

    if (modifiedFiles) {
        console.log("Found a modified file!");
        return modifiedFiles;
    }

    const addedFiles = findFolderBasedOnCommitType(latestCommit, "added");
    if (addedFiles) {
        console.log("Found an added file!");
        return addedFiles;
    }

    const deletedFiles = findFolderBasedOnCommitType(latestCommit, "deleted");
    if (deletedFiles) {
        console.log("Found a deleted file!");
        return deletedFiles;
    }

    return null;
}

function findFolderBasedOnCommitType(latestCommit, commitType) {
    const files = latestCommit[commitType];
    console.log("files", files);
    if (files) {
        const normalizedFolderName = files.map(j => {
            if (j[commitType]) {
                return j[commitType][0].split("/")[0];
            }

            return j.split("/")[0];
        });

        return normalizedFolderName.length ? normalizedFolderName[0] : null;
    }

    return null;
}