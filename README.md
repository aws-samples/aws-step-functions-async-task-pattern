## Building asynchronous workflows without polling for state changes

[AWS Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html) integrates with AWS services, letting you call service API actions from your workflow. For selected long running service actions it can wait for its completion.

But what if your service is not part of these optimized integrations and you still want to wait for a long running job to complete state before continuing with your next task in your workflow? 

This project shows a solution that starts a long running job and then listens to job state changes in [Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html) and only continues when the job reaches a desired state. 

## Solution Architecture

![Solution Architecture](docs/images/solution-architecture.png)

[This blog](https://aws.amazon.com/blogs) exaplains the solution architecutre in detail.

## Deployment

### Prerequisites

- An AWS account with permissions to create AWS resources
- AWS [CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) installed and setup
- AWS environment [bootstrapped](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) for CDK deployment


To deploy this stack to your default AWS account/region, run:

```
cdk deploy
```

## Cleanup

To avoid incurring future charges, delete the resources created during this post.

```
cdk destroy
```

## License

This library is licensed under the MIT-0 License. See the LICENSE file.