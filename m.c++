/**
 * Telegram Web - C++ MTProto & Native Message Engine (m.c++)
 * ------------------------------------------------------------
 * Demonstrates why Telegram builds its core (TDLib) in C++:
 * 1. High-throughput binary serialization & MTProto frame packaging
 * 2. CRC32 / Checksum validation
 * 3. Native TCP socket communication with the Telegram Web backend (pip.py)
 *
 * Compilation:
 *   g++ -O2 m.c++ -o tg_engine
 *
 * Execution:
 *   ./tg_engine
 */

#include <iostream>
#include <vector>
#include <string>
#include <chrono>
#include <iomanip>
#include <cstring>
#include <cstdint>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

// Simple CRC32 implementation for Telegram packet integrity check
uint32_t calculate_crc32(const uint8_t* data, size_t length) {
    uint32_t crc = 0xFFFFFFFF;
    for (size_t i = 0; i < length; ++i) {
        crc ^= data[i];
        for (int j = 0; j < 8; ++j) {
            crc = (crc >> 1) ^ (0xEDB88320 & -(crc & 1));
        }
    }
    return ~crc;
}

// MTProto Packet Structure
struct MTProtoPacket {
    int64_t auth_key_id;
    int64_t message_id;
    int32_t seq_no;
    int32_t message_len;
    std::string payload;
    uint32_t checksum;

    // Serialize packet to binary format
    std::vector<uint8_t> serialize() const {
        std::vector<uint8_t> buffer;
        buffer.resize(sizeof(auth_key_id) + sizeof(message_id) + sizeof(seq_no) + sizeof(message_len) + payload.size() + sizeof(checksum));

        size_t offset = 0;
        std::memcpy(&buffer[offset], &auth_key_id, sizeof(auth_key_id)); offset += sizeof(auth_key_id);
        std::memcpy(&buffer[offset], &message_id, sizeof(message_id)); offset += sizeof(message_id);
        std::memcpy(&buffer[offset], &seq_no, sizeof(seq_no)); offset += sizeof(seq_no);
        std::memcpy(&buffer[offset], &message_len, sizeof(message_len)); offset += sizeof(message_len);
        std::memcpy(&buffer[offset], payload.data(), payload.size()); offset += payload.size();
        std::memcpy(&buffer[offset], &checksum, sizeof(checksum));

        return buffer;
    }
};

// Generate Telegram-style 64-bit message identifier based on UTC timestamp
int64_t generate_telegram_msg_id() {
    auto now = std::chrono::system_clock::now();
    auto epoch = now.time_since_epoch();
    int64_t millis = std::chrono::duration_cast<std::chrono::milliseconds>(epoch).count();
    return (millis << 12);
}

// Benchmark native performance
void benchmark_serialization(int count = 100000) {
    std::cout << "\n[C++ Benchmark] Serializing " << count << " MTProto packets...\n";
    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < count; ++i) {
        MTProtoPacket pkt;
        pkt.auth_key_id = 0x1F2E3D4C5B6A7988ULL;
        pkt.message_id = generate_telegram_msg_id();
        pkt.seq_no = i * 2 + 1;
        pkt.payload = "{\"type\":\"message\",\"text\":\"Speed test from C++ Telegram Engine!\"}";
        pkt.message_len = static_cast<int32_t>(pkt.payload.size());
        pkt.checksum = calculate_crc32(reinterpret_cast<const uint8_t*>(pkt.payload.data()), pkt.payload.size());
        auto bin = pkt.serialize();
        (void)bin; // prevent optimization
    }

    auto end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> elapsed = end - start;
    std::cout << "-> Completed in: " << std::fixed << std::setprecision(2) << elapsed.count() << " ms\n";
    std::cout << "-> Throughput: " << static_cast<int>((count / elapsed.count()) * 1000) << " packets/second\n\n";
}

int main(int argc, char* argv[]) {
    std::cout << "========================================================\n";
    std::cout << "   Telegram Web - C++ MTProto Core Engine (m.c++)\n";
    std::cout << "========================================================\n";

    // Run performance benchmark
    benchmark_serialization(50000);

    // Send a live test message to the Python Telegram Web TCP Bridge
    std::cout << "[Network] Attempting to connect to Telegram Web TCP Bridge (127.0.0.1:3001)...\n";

    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        std::cerr << "Failed to create socket.\n";
        return 1;
    }

    sockaddr_in server_addr{};
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(3001);
    inet_pton(AF_INET, "127.0.0.1", &server_addr.sin_addr);

    if (connect(sock, reinterpret_cast<sockaddr*>(&server_addr), sizeof(server_addr)) == 0) {
        std::string message = "⚡ [C++ Core Engine]: High-performance MTProto message sent to Telegram Web!\n";
        send(sock, message.c_str(), message.length(), 0);
        std::cout << "[Success] Message delivered from C++ to Telegram Web client!\n";
        close(sock);
    } else {
        std::cout << "[Info] Backend TCP Bridge (port 3001) is offline.\n";
        std::cout << "Run 'python3 pip.py' to enable real-time C++ <-> Web messaging.\n";
        close(sock);
    }

    return 0;
}
