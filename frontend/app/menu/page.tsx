'use client';

import { useRef } from 'react';
import useSWR from 'swr';
import { fetcher, DrinkRecipe, InventoryItem } from '@/lib/bar-api';

function canMake(drink: DrinkRecipe, inventory: InventoryItem[]): boolean {
  const stock = new Map(inventory.map((i) => [i.id, i.qtyOnHand]));
  return drink.ingredients.every((ing) => (stock.get(ing.itemId) ?? 0) >= ing.qtyUsed);
}

export default function MenuPage() {
  const { data: drinks = [] } = useSWR<DrinkRecipe[]>('/api/drinks', fetcher);
  const { data: inventory = [] } = useSWR<InventoryItem[]>('/api/inventory', fetcher);
  const printRef = useRef<HTMLDivElement>(null);

  const available = drinks.filter((d) => canMake(d, inventory));

  function handlePrint() {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' }).toLowerCase();
    const day = now.getDate();
    const prev = document.title;
    document.title = `menu_${month}_${day}`;
    window.print();
    document.title = prev;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');

        .menu-root {
          min-height: 100vh;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          font-family: 'Cinzel', serif;
        }

        .menu-title {
          color: #c9a84c;
          font-size: 2rem;
          font-weight: 600;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .menu-rule {
          width: 180px;
          border: none;
          border-top: 1px solid #c9a84c55;
          margin: 1.5rem auto 2.5rem;
        }

        .menu-list {
          width: 100%;
          max-width: 420px;
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
        }

        .menu-item {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
        }

        .menu-dots {
          flex: 1;
          border-bottom: 1px dotted #c9a84c44;
          margin: 0 0.5rem 4px;
        }

        .menu-name {
          color: #c9a84c;
          font-size: 0.95rem;
          font-weight: 400;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .menu-price {
          color: #c9a84c;
          font-size: 0.95rem;
          font-weight: 400;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .menu-footer {
          margin-top: 3rem;
          color: #c9a84c44;
          font-size: 0.6rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          text-align: center;
        }

        .print-btn {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #c9a84c;
          color: #000;
          border: none;
          padding: 0.65rem 1.4rem;
          font-family: 'Cinzel', serif;
          font-size: 0.75rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 2px;
          font-weight: 600;
        }

        .print-btn:hover {
          background: #e2bc5e;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            background: #000 !important;
          }

          .print-btn {
            display: none !important;
          }

          .menu-root {
            min-height: 100vh;
            justify-content: center;
          }
        }
      `}</style>

      <div className='menu-root' ref={printRef}>
        <h1 className='menu-title'>Menu</h1>
        <hr className='menu-rule' />

        <ul className='menu-list'>
          {available.map((drink) => (
            <li key={drink.id} className='menu-item'>
              <span className='menu-name'>{drink.name}</span>
              <span className='menu-dots' />
              <span className='menu-price'>{drink.price}</span>
            </li>
          ))}
        </ul>

        {available.length === 0 && (
          <p style={{ color: '#c9a84c55', fontFamily: 'Cinzel, serif', fontSize: '0.8rem', letterSpacing: '0.2em' }}>
            NO DRINKS AVAILABLE
          </p>
        )}

        <p className='menu-footer'>Tonight&apos;s Selection</p>
      </div>

      <button className='print-btn' onClick={handlePrint}>
        Download PDF
      </button>
    </>
  );
}
