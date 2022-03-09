import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart: Product[] = [...cart];
      const productInCart = updatedCart.find(prod => prod.id === productId);

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const requestedAmount = productInCart ? productInCart.amount + 1 : 1;

      if (stock.amount < requestedAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (!productInCart) {
        const { data: product } = await api.get<Product>(`/products/${productId}`);

        const newProduct: Product = {
          ...product,
          amount: 1,
        }

        updatedCart.push(newProduct);
      } else {
        productInCart.amount = requestedAmount;
      }

      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(prod => prod.id === productId);

      if (!productInCart) {
        throw new Error();
      }

      const updatedCart = cart.filter(product => product.id !== productId);

      setCart(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error();
      }

      const productInCart = cart.find(prod => prod.id === productId);

      if (!productInCart) {
        throw new Error();
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(prod => {
        if (prod.id === productId) {
          prod.amount = amount;
        }

        return prod;
      });

      setCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
