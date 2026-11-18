/*
 * Telegram Web - C Terminal Client (main.c)
 * -----------------------------------------
 * This C client connects directly to the Telegram Web backend TCP Bridge (port 9090).
 * Messages typed here will instantly appear inside your Telegram Web browser chat!
 *
 * Compilation:
 *   gcc main.c -o telegram_cli
 *
 * Execution:
 *   ./telegram_cli
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <pthread.h>

#define SERVER_IP "127.0.0.1"
#define SERVER_PORT 3001
#define BUFFER_SIZE 1024

int sockfd;
volatile int running = 1;

void *receive_messages(void *arg) {
    char buffer[BUFFER_SIZE];
    while (running) {
        ssize_t bytes_received = recv(sockfd, buffer, sizeof(buffer) - 1, 0);
        if (bytes_received > 0) {
            buffer[bytes_received] = '\0';
            printf("\n[Telegram Web Broadcast] %s", buffer);
            printf("> ");
            fflush(stdout);
        } else if (bytes_received == 0) {
            printf("\n[Notice] Disconnected from Telegram Web server.\n");
            running = 0;
            break;
        }
    }
    return NULL;
}

int main() {
    struct sockaddr_in server_addr;
    pthread_t recv_thread;
    char message[BUFFER_SIZE];

    printf("==================================================\n");
    printf("   Telegram Web - Native C Terminal Client\n");
    printf("==================================================\n");
    printf("Connecting to Telegram backend at %s:%d...\n", SERVER_IP, SERVER_PORT);

    // Create socket
    sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0) {
        perror("Error creating socket");
        return 1;
    }

    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(SERVER_PORT);
    if (inet_pton(AF_INET, SERVER_IP, &server_addr.sin_addr) <= 0) {
        perror("Invalid server IP");
        close(sockfd);
        return 1;
    }

    // Connect to Python TCP bridge
    if (connect(sockfd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("Connection failed. Is python3 pip.py running?");
        printf("\nTip: Start the backend first using:\n  python3 pip.py\n");
        close(sockfd);
        return 1;
    }

    printf("[Success] Connected! You are now live with Telegram Web.\n");
    printf("Type a message and press Enter (type 'exit' to quit):\n\n");

    // Launch background receiver thread
    pthread_create(&recv_thread, NULL, receive_messages, NULL);

    while (running) {
        printf("> ");
        fflush(stdout);
        if (!fgets(message, sizeof(message), stdin)) {
            break;
        }

        // Check for exit
        if (strncmp(message, "exit", 4) == 0 && (message[4] == '\n' || message[4] == '\0')) {
            break;
        }

        // Send to Telegram Web bridge
        send(sockfd, message, strlen(message), 0);
    }

    running = 0;
    close(sockfd);
    pthread_join(recv_thread, NULL);
    printf("Client exited cleanly.\n");
    return 0;
}
