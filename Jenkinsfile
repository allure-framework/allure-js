pipeline {
    agent { docker 'timbru31/java-node:alpine' }
    parameters {
        booleanParam(name: 'RELEASE', defaultValue: false, description: 'Perform release?')
        //string(name: 'RELEASE_VERSION', defaultValue: '', description: 'Release version')
        //string(name: 'NEXT_VERSION', defaultValue: '', description: 'Next version (without SNAPSHOT)')
    }
    stages {
        stage('Install') {
            steps {
                sh 'npm install'
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
            when { expression { return params.RELEASE } }
            steps {
            	sh 'echo "todo"'
                //sh 'npm run release'
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
