# Dash

Dash is an open-source data exploration and visualization tool built with DuckDB. It provides an intuitive interface for connecting to databases, importing data files, creating visualizations, and building interactive dashboards.

Dash is available at [https://dash.builders/](https://dash.builders/), also have a look at our [Demo](https://dash.builders/?api=wasm&attach=eJwNx8kNwCAMBMCKwv7pxoAFKFzyoaT8ZH7TzI5GQOgJtVvz5MqS9zJeFvKeqLIP-UAhbZd3TOoL_NI8g2HyT0PxfJf0AWbDHTs).

![Dash Logo](public/favicon/web-app-manifest-192x192.png)

## Features

- **Data Import**: Drag and drop files to import data in various formats
- **SQL Workbench**: Write and execute SQL queries against your data
- **Interactive Dashboards**: Create and customize dashboards with visualizations
- **Data Visualization**: Generate charts and graphs to visualize your data
- **Export Functionality**: Export your data and analysis results

## Technologies

Dash is built with modern web technologies:

- **Frontend**: Next.js, React, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **Data Processing**: DuckDB-WASM for in-browser SQL processing
- **State Management**: Zustand
- **Visualization**: ECharts, Recharts
- **Editor**: EditorJS, Monaco Editor

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- pnpm (recommended) or npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gropaul/dash-ui.git
   cd dash-ui
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to use Dash.

## Building for Production

To build the application for production:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```

## DuckDB Extension

There is a DuckDB extension for Dash available [here](https://github.com/gropaul/dash).

## Contributing

Contributions are welcome! If you find Dash helpful, please consider:

1. Reporting bugs or suggesting features through GitHub issues
2. Submitting pull requests for bug fixes or enhancements
3. Giving our repository a star on GitHub

## License

This project is open source. Please check the repository for license details.

## Repository

Visit our repository: [github.com/gropaul/dash-ui](https://github.com/gropaul/dash-ui)
