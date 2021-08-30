const AWS = require("aws-sdk");
const crypto = require('crypto');
const codePipeline = new AWS.CodePipeline()
const { CodePipelineClient, StartPipelineExecutionCommand} = require("@aws-sdk/client-codepipeline");

const region = "eu-west-1";
const secretName = "github/webhooks/mfe-pipeline";
let secret;
let decodedBinarySecret;


const client = new CodePipelineClient({
    region: region
});

var clientSecretManager = new AWS.SecretsManager({
    region: region
});

exports.handler = async (event) => {
    let secret;
    try {
        const response = await clientSecretManager.getSecretValue({SecretId: secretName}).promise();
        secret = JSON.parse(response.SecretString)["GITHUB_WEBHOOK_SECRET"];
        console.log("SSSSSS", response.SecretString);
         console.log("SSSSS22S", secret);
    } catch (e) {
        console.log(e);
        return {
            statusCode: 401,
            body: JSON.stringify('Could not get secret.'),
        };
    }


    const isValid = validateGitHubAuthentication(event, secret);

    if (!isValid) {
        return {
            statusCode: 401,
            body: JSON.stringify('Unauthorized api caller.'),
        };
    }
    const body = JSON.parse(event.body);

    const microFrontendNames = findMicroFrontendNames( body["commits"][0]);

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



function validateGitHubAuthentication(event, secret) {
    const {body, headers} = event;
    const headerSignature = headers["X-Hub-Signature-256"];

    const decryptedSignature = crypto
         .createHmac('sha256', secret)
         .update(JSON.stringify(body))
         .digest('hex');

    return headerSignature !== decryptedSignature;
}

function findMicroFrontendNames(latestCommit) {
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
        })
        .filter(name => {
            return name.startsWith("mfe-");
        });

    return [...new Set(mfeNames)];
}