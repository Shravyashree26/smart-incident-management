pipeline {
    agent any

    environment {
        DOCKER_REGISTRY  = 'shravyagowda'
        BACKEND_IMAGE    = "${DOCKER_REGISTRY}/smart-incident-management-backend"
        FRONTEND_IMAGE   = "${DOCKER_REGISTRY}/smart-incident-management-frontend"
        IMAGE_TAG        = "v${BUILD_NUMBER}"
        VITE_API_URL     = 'http://13.204.88.23:8081'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo "Running SonarQube Code Quality Analysis"
                dir('backend') {
                    withSonarQubeEnv('SonarQube') {
                        withCredentials([
                            string(
                                credentialsId: 'sonarqube-token',
                                variable: 'SONAR_TOKEN'
                            )
                        ]) {
                            sh '''
                                chmod +x mvnw
                                ./mvnw clean verify sonar:sonar \
                                    -Dsonar.projectKey=Smart-Incident-Management \
                                    -Dsonar.projectName=Smart-Incident-Management \
                                    -Dsonar.host.url=$SONAR_HOST_URL \
                                    -Dsonar.token=$SONAR_TOKEN \
                                    -Dsonar.java.binaries=target/classes \
                                    -Dsonar.qualitygate.wait=false
                            '''
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo "Checking SonarQube Quality Gate"
                // Requires a webhook configured in SonarQube pointing to:
                // http://<jenkins-host>:8080/sonarqube-webhook/
                // Without it, this stage will hang for the full timeout instead of failing fast.
                timeout(time: 30, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Backend Package') {
            steps {
                // Sonar's 'verify' already ran the build/tests above and produced target/*.jar,
                // so this just re-packages without re-running tests (fast, no duplicate work).
                sh '''
                    chmod +x backend/mvnw
                    ./backend/mvnw -f backend/pom.xml package -DskipTests
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                sh '''
                    cd frontend
                    npm ci
                    npm run build
                '''
            }
        }

        stage('Backend Docker Build') {
            steps {
                sh '''
                    docker build \
                        -t ${BACKEND_IMAGE}:${IMAGE_TAG} \
                        -t ${BACKEND_IMAGE}:latest \
                        backend
                '''
            }
        }

        stage('Frontend Docker Build') {
            steps {
                sh '''
                    docker build \
                        --build-arg VITE_API_URL=${VITE_API_URL} \
                        -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                        -t ${FRONTEND_IMAGE}:latest \
                        frontend
                '''
            }
        }

        stage('Docker Push') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker push ${BACKEND_IMAGE}:latest
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker push ${FRONTEND_IMAGE}:latest
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    echo "COMPOSE_PROJECT_NAME=smart-incident-management" > .env
                    export IMAGE_TAG=${IMAGE_TAG}

                    echo "Stopping and removing previous stack (if any)"
                    docker compose down --remove-orphans || true

                    echo "Pulling latest images"
                    docker compose pull

                    echo "Starting application"
                    docker compose up -d

                    echo "Deployment completed"
                    docker ps
                '''
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
        success {
            echo 'Smart Incident Management deployment completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check Jenkins console output.'
        }
    }
}
