import asyncio
from backend.ais_handler import fetch_nearby_ships

async def main():
    print("Fetching ships...")
    ships = await fetch_nearby_ships(50.0, -0.5)
    print(f"Found {len(ships)} ships.")
    for ship in ships[:3]:
        print(ship)

if __name__ == "__main__":
    asyncio.run(main())
