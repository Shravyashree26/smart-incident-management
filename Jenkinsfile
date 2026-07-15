pipeline {

    agent any

    environment {

        DOCKER_REGISTRY = 'shravyagowda'

        BACKEND_IMAGE = "${DOCKER_REGISTRY}/smart-incident-management-backend"

        FRONTEND_IMAGE = "${DOCKER_REGISTRY}/smart-incident-management-frontend"

        IMAGE_TAG = "v${BUILD_NUMBER}"

        VITE_API_URL = 'http://13.204.88.23:8081'

    }


    stages {


        stage('Checkout') {

            steps {

                checkout scm

            }

        }



        stage('Backend Build') {

            steps {

                sh '''

                    chmod +x backend/mvnw


                    ./backend/mvnw \
                    -f backend/pom.xml \
                    clean package \
                    -DskipTests

                '''

            }

        }




        stage('SonarQube Analysis') {

            steps {

                echo "Running SonarQube Code Quality Analysis"


                dir('backend') {


                    withSonarQubeEnv('SonarQube') {


                        sh '''

                            chmod +x mvnw


                            ./mvnw clean verify sonar:sonar \

                            -Dsonar.projectKey=Smart-Incident-Management


                        '''

                    }

                }

            }

        }




        stage('Quality Gate') {

            steps {


                echo "Checking SonarQube Quality Gate"



                timeout(time: 10, unit: 'MINUTES') {


                    waitForQualityGate abortPipeline: true


                }


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

                        echo "$DOCKER_PASSWORD" | docker login \

                        -u "$DOCKER_USERNAME" \

                        --password-stdin



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


                    echo "Stopping old containers"


                    docker compose down --remove-orphans || true





                    echo "Removing old containers"


                    docker rm -f smartims-postgres smartims-backend smartims-frontend || true





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
