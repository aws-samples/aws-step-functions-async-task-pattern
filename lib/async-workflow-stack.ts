// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'

import { AsyncTask } from './async-task'
import { ExampleFlow } from './appflow-example'

import { RemovalPolicy } from 'aws-cdk-lib'

export class AsyncWorkflowStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const flow = new ExampleFlow(this, 'example-flow')

    const tokenTable = new dynamodb.Table(this, 'token-table', {
      tableName: 'TaskTokens',
      partitionKey: { name: 'ExecutionId', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY
    })

    const startFlow = new tasks.CallAwsService(this, 'StartFlow', {
      service: 'appflow',
      action: 'startFlow',
      parameters: {
        FlowName: flow.flowName
      },
      iamResources: ['*']
    })

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const main = new sfn.StateMachine(this, 'main', {
      stateMachineName: `${this.stackName}-main`,
      definition: new AsyncTask(this, 'StartAsyncJobWorkflow', {
        tokenTable,
        state: startFlow,
        callServiceExecutionIdPath: '$.ExecutionId',
        successEventPattern: {
          source: ['aws.appflow'],
          detailType: ['AppFlow End Flow Run Report'],
          detail: {
            status: ['Execution Successful']
          }
        },
        failureEventPattern: {
          source: ['aws.appflow'],
          detailType: ['AppFlow End Flow Run Report'],
          detail: {
            status: [{ 'anything-but': 'Execution Successful' }]
          }
        },
        eventExecutionIdPath: '$.detail.execution-id'
      })
    })
  }
}
