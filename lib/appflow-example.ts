// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs'
import type * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as appflow from 'aws-cdk-lib/aws-appflow'
import { RemovalPolicy } from 'aws-cdk-lib'
import { Effect, ServicePrincipal } from 'aws-cdk-lib/aws-iam'

export class ExampleFlow extends Construct {
  readonly flowName: string
  constructor (scope: Construct, id: string) {
    super(scope, id)

    const stackName = (scope as cdk.Stack).stackName

    const bucket = new s3.Bucket(scope, `${id}-flow-bucket`, {
      removalPolicy: RemovalPolicy.DESTROY
    })

    bucket.addToResourcePolicy(new iam.PolicyStatement({
      principals: [new ServicePrincipal('appflow.amazonaws.com')],
      actions: [
        's3:ListBucket',
        's3:GetObject',
        's3:PutObject',
        's3:AbortMultipartUpload',
        's3:ListMultipartUploadParts',
        's3:ListBucketMultipartUploads',
        's3:GetBucketAcl',
        's3:PutObjectAcl'
      ],
      effect: Effect.ALLOW,
      resources: [bucket.bucketArn, `${bucket.bucketArn}/*`]
    }))

    // eslint-disable-next-line no-new
    new s3deploy.BucketDeployment(scope, 'simple-json', {
      sources: [s3deploy.Source.jsonData('example.json', {
        hello: 'world'
      })],
      destinationBucket: bucket,
      destinationKeyPrefix: 'input'
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const flow = new appflow.CfnFlow(scope, `${id}-flow`, {
      triggerConfig: {
        triggerType: 'OnDemand'
      },
      flowName: `${stackName}-example-flow`,
      sourceFlowConfig: {
        connectorType: 'S3',
        sourceConnectorProperties: {
          s3: {
            bucketName: bucket.bucketName,
            bucketPrefix: 'input',
            s3InputFormatConfig: {
              s3InputFileType: 'JSON'
            }
          }
        }
      },
      destinationFlowConfigList: [{
        connectorType: 'S3',
        destinationConnectorProperties: {
          s3: {
            bucketName: bucket.bucketName,
            bucketPrefix: 'output',
            s3OutputFormatConfig: {
              fileType: 'JSON'
            }
          }
        }
      }],
      tasks: [{
        sourceFields: ['hello'],
        connectorOperator: {
          s3: 'PROJECTION'
        },
        taskType: 'Filter',
        taskProperties: []
      },
      {
        sourceFields: ['hello'],
        connectorOperator: {
          s3: 'NO_OP'
        },
        destinationField: 'hello',
        taskType: 'Map',
        taskProperties: [
          {
            key: 'DESTINATION_DATA_TYPE',
            value: 'string'
          },
          {
            key: 'SOURCE_DATA_TYPE',
            value: 'string'
          }
        ]
      }
      ]
    })

    this.flowName = flow.flowName
  }
}
