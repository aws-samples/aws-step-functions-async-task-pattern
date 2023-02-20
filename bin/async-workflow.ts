// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib'
import { AsyncWorkflowStack } from '../lib/async-workflow-stack'
// import { AwsSolutionsChecks } from 'cdk-nag'
// import { Aspects } from 'aws-cdk-lib'

const app = new cdk.App()
// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))
// eslint-disable-next-line no-new
new AsyncWorkflowStack(app, 'async-workflow-pattern')
