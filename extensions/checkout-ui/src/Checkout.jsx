import {
  Banner,
  useApi,
  useTranslate,
  reactExtension,
  Checkbox,
  Button,
  Form,
  BlockSpacer,
  ProductThumbnail,
  InlineLayout,
  Spinner,
  InlineStack
} from '@shopify/ui-extensions-react/checkout';
import { React, useState, useEffect } from 'react';


//************ IMPORTANT: UPDATE BACKEND URL BEFORE RUNNING ************* //
const BKND_URL = 'https://pleased-literacy-crash-valve.trycloudflare.com'

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />,
);

function Extension() {
  const { lines, checkoutToken, shop, sessionToken } = useApi();
  const items = lines.current;

  const [clearCheckbox, setClearCheckbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [controlInput, setControlInput] = useState({});


  //  Set intial values to controlInput state.
  useEffect(() => {
    setControlInput(buildControlObj());
  }, []);

  // Clear all checkboxes.
  useEffect(() => {

    const reset = Object.fromEntries(
      Object.entries(controlInput)
      .map(([key, value]) => [key, false]));

    setControlInput(reset);

  }, [clearCheckbox]);



  // Build object to control checkboxes
  const buildControlObj = () => {
    return control = items.reduce((accumulator, ord) => {
      for (let i = 0; i < ord.quantity; i++) {
        const uniqueCheckboxId = `${ord.merchandise.id}_${i}`;
        accumulator[uniqueCheckboxId] = false;
      }
      return accumulator;
    }, {});

  }

  // Extract JWT
  const getJWT = async () => {
    return await sessionToken.get();
  };

  // Create checkbox elements array for cart products.
  let checkboxList = lines.current.reduce((accumulator, ord) => {
    for (let i = 0; i < ord.quantity; i++) {
      const uniqueCheckboxId = `${ord.merchandise.id}_${i}`;
      accumulator.push(
        <InlineLayout columns={['70%', 'fill']} key={uniqueCheckboxId}>
          <Checkbox
            key={uniqueCheckboxId}
            id={uniqueCheckboxId}
            name='checkbox'
            onChange={(event) => handleChange(event, uniqueCheckboxId)}
            value={controlInput[uniqueCheckboxId]}
          >
            {ord.merchandise.title}
          </Checkbox>

          <ProductThumbnail size="small" source={ord.merchandise.image.url} />
        </InlineLayout>
      );
    }
    return accumulator;
  }, []);




  // Handle check box change.
  const handleChange = (event, itemID) => {
    setControlInput(prev => { return { ...prev, [itemID]: event } })
  };

  // Handle Submit, sends the order to the backend.
  const submitHandler = async () => {
    // Create items array from the contorolInput object, adding only checked items.
    const itemsArray = Object.entries(controlInput)
      .filter(([key, value]) => value === true)
      .map(([key, value]) => key.split('_')[0]);

    // Build order

    const order = {
      shop: shop.id,
      id: checkoutToken.current,
      items: itemsArray
    }
    setLoading(true);

    // Check if order is empty.

    if (itemsArray.length === 0) {
      setLoadingMessage('Cart is empty. Add items to your cart.');
      setTimeout(() => {
        setLoading(false);
      }, 500);
      return;
    };

    setLoadingMessage('Saving your cart...');
    const JWT = await getJWT();
    fetch(`${BKND_URL}/api/saveOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT}`,
      },
      body: JSON.stringify(order),
    })
      .then(data => {
        setLoadingMessage('Cart saved !');

        // Trigger checkbox clear
        setClearCheckbox(prev => !prev);
      })
      .catch(error => setLoadingMessage('Error, cart not saved.'))
      .finally(() => {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      });
  };

  return (
    <Banner title="Save order for later" collapsible={true}>
      <Form onSubmit={submitHandler}>
        {checkboxList}
        <BlockSpacer spacing="base" />
        {loading ? <InlineStack columns={['20%', 'fill']}>  <Spinner /> {loadingMessage} </InlineStack> : <Button accessibilityRole="submit">Save</Button>}
      </Form>
    </Banner>
  );
}
