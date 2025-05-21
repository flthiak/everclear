import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StockTableRow {
  id: string;
  name: string;
  quantity?: number;
  factory?: number;
  godown?: number;
  total?: number;
  value: number;
  price?: number;
  isNew?: boolean;
}

interface StockTableProps {
  data: StockTableRow[];
  showProduction?: boolean;
  showTotal?: boolean;
  showPrice?: boolean;
}

export function StockTable({ data, showProduction, showTotal, showPrice }: StockTableProps) {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.idCell]}>ID</Text>
        <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
        {!showProduction && (
          <>
            <Text style={[styles.headerCell, styles.quantityCell]}>Quantity</Text>
            {showPrice && <Text style={[styles.headerCell, styles.priceCell]}>Price</Text>}
            <Text style={[styles.headerCell, styles.priceCell]}>Value</Text>
          </>
        )}
        {showProduction && (
          <>
            <Text style={[styles.headerCell, styles.quantityCell]}>Quantity</Text>
            {showPrice && <Text style={[styles.headerCell, styles.priceCell]}>Price</Text>}
            <Text style={[styles.headerCell, styles.priceCell]}>Value</Text>
          </>
        )}
      </View>

      {data.map((item) => (
        <View key={item.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{item.id}</Text>
          <View style={[styles.cell, styles.nameCell, styles.nameContainer]}>
            <Text style={styles.nameText}>{item.name}</Text>
            {item.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            )}
          </View>
          {!showProduction && (
            <>
              <Text style={[styles.cell, styles.quantityCell]}>{item.quantity}</Text>
              {showPrice && <Text style={[styles.cell, styles.priceCell]}>₹{item.price?.toLocaleString()}</Text>}
              <Text style={[styles.cell, styles.priceCell]}>₹{item.value.toLocaleString()}</Text>
            </>
          )}
          {showProduction && (
            <>
              <Text style={[styles.cell, styles.quantityCell]}>{item.quantity}</Text>
              {showPrice && <Text style={[styles.cell, styles.priceCell]}>₹{item.price?.toLocaleString()}</Text>}
              <Text style={[styles.cell, styles.priceCell]}>₹{item.value.toLocaleString()}</Text>
            </>
          )}
        </View>
      ))}

      {showTotal && (
        <View style={styles.totalRow}>
          <Text style={[styles.cell, styles.idCell]}></Text>
          <Text style={[styles.cell, styles.nameCell, styles.totalLabel]}>Total Value</Text>
          {!showProduction && (
            <>
              <Text style={[styles.cell, styles.quantityCell]}></Text>
              {showPrice && <Text style={[styles.cell, styles.priceCell]}></Text>}
              <Text style={[styles.cell, styles.priceCell, styles.totalValue]}>
                ₹{totalValue.toLocaleString()}
              </Text>
            </>
          )}
          {showProduction && (
            <>
              <Text style={[styles.cell, styles.quantityCell]}></Text>
              {showPrice && <Text style={[styles.cell, styles.priceCell]}></Text>}
              <Text style={[styles.cell, styles.priceCell, styles.totalValue]}>
                ₹{totalValue.toLocaleString()}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2B7BB0',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'left',
    paddingHorizontal: 12,
    fontFamily: 'AsapCondensed_400Regular',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  cell: {
    fontSize: 14,
    color: '#333',
    textAlign: 'left',
    paddingHorizontal: 12,
    fontFamily: 'AsapCondensed_400Regular',
  },
  idCell: {
    flex: 1,
  },
  nameCell: {
    flex: 1,
  },
  quantityCell: {
    flex: 1,
  },
  priceCell: {
    flex: 1,
    paddingHorizontal: 8,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
  },
  totalLabel: {
    textAlign: 'right',
    paddingRight: 14,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  totalValue: {
    color: '#2B7BB0',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'AsapCondensed_400Regular',
  },
}); 