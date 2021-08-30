const AWS = require("aws-sdk");
const codePipeline = new AWS.CodePipeline()
const { CodePipelineClient, StartPipelineExecutionCommand} = require("@aws-sdk/client-codepipeline");

const client = new CodePipelineClient({
    region: "eu-west-1"
});

exports.handler = async (event) => {
    const microFrontendNames = findMicroFrontendNames( event["commits"][0]);

    if (!microFrontendNames || !microFrontendNames.length) {
        return {
            statusCode: 404,
            body: JSON.stringify('Folder cannot be found'),
        };
    }

    const codePipelinePromises = [];

    microFrontendNames.forEach(microFrontendName => {
        const params = {
          name: microFrontendName
        };

        const command = new StartPipelineExecutionCommand(params);

        codePipelinePromises.push(client.send(command));
    });

    const result = await Promise.allSettled(codePipelinePromises);

    console.log("Response was: ", result);
    return {
         statusCode: 200,
         body: JSON.stringify('Code pipeline triggered: ' + result),
    };

};

function findMicroFrontendNames(latestCommit) {
    console.log("Try",  latestCommit["modified"]
        .concat(latestCommit["added"])
        .concat(latestCommit["removed"]));

    const mfeNames = latestCommit["modified"]
        .concat(latestCommit["added"])
        .concat(latestCommit["removed"])
        .map(filePath => {
            if (filePath["modified"]) {
                return filePath["modified"][0].split("/")[0];
            }
            if (filePath["added"]) {
                return filePath["added"][0].split("/")[0];
            }
            if (filePath["removed"]) {
                return filePath["removed"][0].split("/")[0];
            }

            return filePath.split("/")[0];
        });

    return [...new Set(mfeNames)];
}