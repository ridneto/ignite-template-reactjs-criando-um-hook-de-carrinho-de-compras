import { createContext, ReactNode, useContext, useState } from 'react';
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

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  
 
  async function checkAvailableProductInStock(productId: number, requiredAmount: number) {
    const { data } = await api.get<Stock>(`/stock/${productId}`)
    
    return requiredAmount <= data.amount;
  }

  const addProduct = async (productId: number) => {
    try {
      const indexProductInCart = cart.findIndex(product => product.id === productId);
      let newCart = [...cart];
      let newAmount = 1;
    
      if(indexProductInCart > -1){
        newAmount += newCart[indexProductInCart].amount;
      }

      const isAvailableProductInStock = await checkAvailableProductInStock(productId, newAmount);

      if(!isAvailableProductInStock){
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if(indexProductInCart > -1){
        newCart[indexProductInCart].amount++;
      } else {
        const { data } = await api.get<Product>(`/products/${productId}`)
        
        newCart.push({
          ...data,
          amount: newAmount
        });
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (e){
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const indexPrdouctInCart = cart.findIndex(product => product.id === productId);

      if(indexPrdouctInCart === -1){
        toast.error('Erro na remoção do produto');
        return;
      }

      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart)); 
    } catch(e) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1){
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const indexProductInCart = cart.findIndex(product => product.id === productId);
      let newCart = [...cart];
      
      if(indexProductInCart === -1){
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const isAvailableProductInStock = await checkAvailableProductInStock(productId, amount);

      if(!isAvailableProductInStock){
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      newCart[indexProductInCart].amount = amount;

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (e){
      toast.error("Erro na alteração de quantidade do produto");
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
