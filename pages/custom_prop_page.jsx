export default ({ cp }) => <div>another hello world page, customProperty value: {cp.value}</div>;

export const getServerSideProps = async function (ctx) {
  //@ts-ignore
  return {
    props: {
      cp: ctx.req.customProperty,
    },
  };
};
