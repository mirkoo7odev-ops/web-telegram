using System;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

namespace TelegramWeb
{
    /// <summary>
    /// Telegram Web - C# .NET Bot & Bridge Client (eck.cs)
    /// ----------------------------------------------------
    /// Demonstrates how .NET / C# services integrate with the Telegram Web backend:
    /// - Asynchronous socket streaming via TcpClient & NetworkStream
    /// - Live bidirectional communication with web clients connected via WebSockets
    /// </summary>
    public class TelegramBridgeClient
    {
        private const string Host = "127.0.0.1";
        private const int Port = 3001;

        public static async Task Main(string[] args)
        {
            Console.WriteLine("========================================================");
            Console.WriteLine("   Telegram Web - C# .NET Bridge Client (eck.cs)");
            Console.WriteLine("========================================================");
            Console.WriteLine($"Connecting to Telegram Web Backend at {Host}:{Port}...");

            try
            {
                using var client = new TcpClient();
                await client.ConnectAsync(Host, Port);
                Console.WriteLine("[Success] Connected! You can now send messages to Telegram Web.");

                using var stream = client.GetStream();
                using var reader = new StreamReader(stream, Encoding.UTF8);
                using var writer = new StreamWriter(stream, Encoding.UTF8) { AutoFlush = true };

                // Background task to listen for broadcast messages from Telegram Web
                var receiveTask = Task.Run(async () =>
                {
                    while (true)
                    {
                        var line = await reader.ReadLineAsync();
                        if (line == null) break;
                        Console.WriteLine($"\n[Broadcast received from Telegram Web] {line}");
                        Console.Write("> ");
                    }
                });

                // Send an initial handshake announcement
                await writer.WriteLineAsync("🚀 [C# .NET Service]: Telegram Bot Service online via eck.cs!");

                Console.WriteLine("Type a message and press Enter (type 'exit' to quit):\n");

                while (true)
                {
                    Console.Write("> ");
                    var input = Console.ReadLine();
                    if (string.IsNullOrWhiteSpace(input) || input.Trim().Equals("exit", StringComparison.OrdinalIgnoreCase))
                    {
                        break;
                    }

                    await writer.WriteLineAsync($"[C# Bot]: {input}");
                }
            }
            catch (SocketException)
            {
                Console.WriteLine("\n[Notice] Could not connect to the Telegram Web backend on port 9090.");
                Console.WriteLine("Make sure the Python server is running first:");
                Console.WriteLine("   python3 pip.py");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Error]: {ex.Message}");
            }
        }
    }
}
