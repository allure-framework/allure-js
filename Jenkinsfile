pipeline {
    agent { docker 'timbru31/java-node:8' }

    parameters {
        booleanParam(name: 'RELEASE', defaultValue: false, description: 'Perform release?')
        string(name: 'RELEASE_VERSION', defaultValue: '', description: 'Release version')
    }
    stages {
        stage('Install') {
            steps {
                sh 'npm install'
                sh 'npm run prepare'
            }
        }
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        stage('Test') {
            steps {
                sh 'npm run run-test'
            }
        }
        stage('Release') {
            steps {
                sh 'apt-get update && apt-get install --no-install-recommends -y git ssh'
                withCredentials([usernamePassword(credentialsId: 'qameta-ci_npm',
                        usernameVariable: 'NPM_USER', passwordVariable: 'NPM_PASS')]) {
                    sshagent(['qameta-ci_ssh']) {
                        sh 'npm install -g npm-cli-login'
                        sh 'npm-cli-login -e ci@qameta.io'
                        sh 'npm run release -- 2.0.0-beta.1'
                    }
                }
            }
        }
    }
    post {
        always {
            deleteDir()
        }
        failure {
            slackSend message: "${env.JOB_NAME} - #${env.BUILD_NUMBER} failed (<${env.BUILD_URL}|Open>)",
                    color: 'danger', teamDomain: 'qameta', channel: 'allure-js', tokenCredentialId: 'allure-channel'
        }
    }
}
