// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import type * as cdk from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import * as eb from 'aws-cdk-lib/aws-events'
import * as ebtg from 'aws-cdk-lib/aws-events-targets'
import { SuccessCallbackExecution } from './success-callback'
import { FailureCallbackExecution } from './failure-callback'

export interface AsyncTaskProps {
  readonly tokenTable: dynamodb.Table
  readonly state: sfn.TaskStateBase
  readonly callServiceExecutionIdPath: string
  readonly successEventPattern: eb.EventPattern
  readonly failureEventPattern: eb.EventPattern
  readonly eventExecutionIdPath: string
}

export class AsyncTask extends tasks.StepFunctionsStartExecution {
  constructor (scope: Construct, id: string, asyncTaskProps: AsyncTaskProps) {
    const stackName = (scope as cdk.Stack).stackName

    const successCallbackExecution = new SuccessCallbackExecution(scope, `${id}-sfn-success-callback`, {
      tokenTable: asyncTaskProps.tokenTable,
      eventExecutionIdPath: asyncTaskProps.eventExecutionIdPath
    })

    const succesRule = new eb.Rule(scope, `${id}-success-callback`, {
      eventPattern: asyncTaskProps.successEventPattern
    })

    succesRule.addTarget(new ebtg.SfnStateMachine(successCallbackExecution))

    const failureCallbackExecution = new FailureCallbackExecution(scope, `${id}-sfn-failure-callback`, {
      tokenTable: asyncTaskProps.tokenTable,
      eventExecutionIdPath: asyncTaskProps.eventExecutionIdPath
    })

    const failureRule = new eb.Rule(scope, `${id}-failure-callback`, {
      eventPattern: asyncTaskProps.failureEventPattern
    })

    failureRule.addTarget(new ebtg.SfnStateMachine(failureCallbackExecution))

    const saveToken = new tasks.CallAwsService(scope, 'SaveTaskToken', {
      service: 'dynamodb',
      action: 'putItem',
      parameters: {
        TableName: asyncTaskProps.tokenTable.tableName,
        Item: {
          ExecutionId: {
            'S.$': asyncTaskProps.callServiceExecutionIdPath
          },
          Token: {
            'S.$': '$$.Execution.Input.Token'
          }
        }
      },
      iamResources: [asyncTaskProps.tokenTable.tableArn]
    })

    const callAsyncJobStatemachine = new sfn.StateMachine(scope, `${id}-call-job`, {
      stateMachineName: `${stackName}-call-job`,
      definition: asyncTaskProps.state.next(saveToken)
    })

    super(scope, id, {
      associateWithParent: true,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      stateMachine: callAsyncJobStatemachine,
      input: sfn.TaskInput.fromObject({
        Token: sfn.JsonPath.taskToken
      })
    })
  }
}
