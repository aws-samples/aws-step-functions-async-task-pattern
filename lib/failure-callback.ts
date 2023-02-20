// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import type * as cdk from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Effect } from 'aws-cdk-lib/aws-iam'

export interface FailureCallbackExecutionProps {
  readonly tokenTable: dynamodb.Table
  readonly eventExecutionIdPath: string
}

export class FailureCallbackExecution extends sfn.StateMachine {
  constructor (scope: Construct, id: string, successCallbackExecutionProps: FailureCallbackExecutionProps) {
    const stackName = (scope as cdk.Stack).stackName

    const getToken = new tasks.CallAwsService(scope, 'GetToken', {
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

    const sendTaskFailure = new tasks.CallAwsService(scope, 'SendTaskSuccessFailure', {
      service: 'sfn',
      action: 'sendTaskFailure',
      parameters: {
        'TaskToken.$': '$.Item.Token.S'
      },
      iamResources: ['*'],
      additionalIamStatements: [new iam.PolicyStatement({
        actions: ['states:SendTaskFailure'],
        effect: Effect.ALLOW,
        resources: ['*']
      })]
    })

    super(scope, id, {
      stateMachineName: `${stackName}-failure-callback`,
      definition: getToken.next(sendTaskFailure)
    })
  }
}
