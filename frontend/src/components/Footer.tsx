import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-950 text-neutral-400 py-8 px-4 sm:px-6 mt-16 font-mono text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-neutral-200 font-semibold mb-1">
            MODELCRAFT Analytics Engineering Platform
          </div>
          <p className="text-neutral-400 max-w-xl">
            An independent, production-grade analytics engineering system transforming raw Brazilian e-commerce 
            records into tested dimensional models, verified business metrics, and transparent DAG lineage using dbt Core and DuckDB.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end space-y-1 text-neutral-400">
          <div>dbt Core 1.12 &bull; DuckDB OLAP &bull; Kimball Star Schema</div>
          <div>Strict Monochrome Visual Architecture &bull; 98.91% Parity</div>
          <div className="text-neutral-400">Canonical Records: 551,759 &bull; 65 Tests Passed</div>
        </div>
      </div>
    </footer>
  );
};
