import asyncio
import websockets

async def check_websocket_server(host="127.0.0.1", port=3031):
    url = f"ws://{host}:{port}/ws"
    try:
        async with websockets.connect(url) as websocket:
            print(f"✅ Connected to {url}")
            await websocket.send("ping")
            response = await websocket.recv()
            print(f"📨 Received: {response}")
    except Exception as e:
        print(f"❌ Could not connect to {url}")
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_websocket_server())
