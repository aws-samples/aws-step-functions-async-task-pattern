// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import type * as cdk from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Effect } from 'aws-cdk-lib/aws-iam'

export interface SuccessCallbackExecutionProps {
  readonly tokenTable: dynamodb.Table
  readonly eventExecutionIdPath: string
}

export class SuccessCallbackExecution extends sfn.StateMachine {
  constructor (scope: Construct, id: string, successCallbackExecutionProps: SuccessCallbackExecutionProps) {
    const stackName = (scope as cdk.Stack).stackName

    const getToken = new tasks.CallAwsService(scope, 'GetTaskToken', {
      service: 'dynamodb',
      action: 'getItem',
      parameters: {
        TableName: successCallbackExecutionProps.tokenTable.tableName,
        Key: {
          ExecutionId: {
            'S.$': successCallbackExecutionProps.eventExecutionIdPath
          }
        }
      },
      iamResources: [successCallbackExecutionProps.tokenTable.tableArn]
    })

    const sendTaskSuccess = new tasks.CallAwsService(scope, 'SendTaskSuccessToken', {
      service: 'sfn',
      action: 'sendTaskSuccess',
      parameters: {
        'Output.$': '$$.Execution.Input',
        'TaskToken.$': '$.Item.Token.S'
      },
      iamResources: ['*'],
      additionalIamStatements: [new iam.PolicyStatement({
        actions: ['states:SendTaskSuccess'],
        effect: Effect.ALLOW,
        resources: ['*']
      })]
    })

    super(scope, id, {
      stateMachineName: `${stackName}-callback`,
      definition: getToken.next(sendTaskSuccess)
    })
  }
}
